import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Octokit } from 'octokit';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  parseDynamicFragranceData,
  parseStaticFragranceData,
  type DynamicFragranceData,
  type StaticFragranceData,
  type Fragrance,
} from './types';
import type { Session } from './AuthProvider';

const DEBOUNCE_DELAY_MS = 3000;

// Public return types for the hook
export type FragranceQuery = {
  fragrances?: Record<number, Fragrance> | undefined;
  error: Error | null;
  isPending: boolean;
};

export type FragranceMutation = {
  error: Error | null;
  isPending: boolean;
  saveDynamicFragranceData: (d: DynamicFragranceData) => void;
  saveDynamicFragranceDataNow: (d: DynamicFragranceData) => void;
};

export type UseFragranceResult = {
  query: FragranceQuery;
  mutation: FragranceMutation;
};

export function useFragrances(session: Session): UseFragranceResult {
  const octokit = useMemo(() => new Octokit({ auth: session.accessToken }), [session]);
  const queryClient = useQueryClient();

  async function fetchAndParseJsonl<T>(path: string, parser: (value: any) => T): Promise<{ data: Record<number, T>; sha: string }> {
    const { data } = await octokit.rest.repos.getContent({ owner: session.owner, repo: session.repo, path });
    if (!('content' in data) || typeof data.content !== 'string' || !('sha' in data)) {
      throw new Error(`${path}: Missing or invalid content or sha field in GitHub API response`);
    }
    const decodedContent = new TextDecoder('utf-8').decode(Uint8Array.from(atob(data.content), c => c.charCodeAt(0)));
    const items = decodedContent.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    const parsed: Record<number, T> = {};
    for (const item of items) parsed[Number(item.id)] = parser(item);
    return { data: parsed, sha: (data as any).sha };
  }

  const staticQuery = useQuery<{ data: Record<number, StaticFragranceData>; sha: string }, Error>({
    queryKey: ['static-fragrance-data'],
    queryFn: () => fetchAndParseJsonl<StaticFragranceData>('static-fragrance-data.jsonl', parseStaticFragranceData),
  });

  const dynamicQuery = useQuery<{ data: Record<number, DynamicFragranceData>; sha: string }, Error>({
    queryKey: ['dynamic-fragrance-data'],
    queryFn: () => fetchAndParseJsonl<DynamicFragranceData>('dynamic-fragrance-data.jsonl', parseDynamicFragranceData),
  });

  // mutation (writes encoded JSONL back to repo)
  async function saveDynamicFragranceData(updatedDynamicData: DynamicFragranceData) {
    const currentDynamicDataWithSha = queryClient.getQueryData<{ data: Record<number, DynamicFragranceData>; sha: string }>(['dynamic-fragrance-data']);
    if (!currentDynamicDataWithSha) throw new Error('No dynamic fragrance data in cache');

    const updatedData = { ...currentDynamicDataWithSha.data, [updatedDynamicData.id]: updatedDynamicData };

    const jsonlContent = Object.values(updatedData)
      .sort((a, b) => a.id - b.id)
      .map(item => {
        const sortedItem = Object.fromEntries(
          Object.entries(item)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
              if (value instanceof Set || Array.isArray(value)) return [key, [...value].sort()];
              if (value instanceof Date) return [key, value.toISOString()];
              return [key, value];
            })
        );
        return JSON.stringify(sortedItem);
      })
      .join('\n');
    const encodedContent = btoa(String.fromCharCode(...new TextEncoder().encode(jsonlContent)));

    const actualDynamicDataChanges =
      Object.entries(updatedDynamicData)
        .sort(([a], [b]) => a.localeCompare(b))
        .filter(([key, value]) => {
          const currentValue = currentDynamicDataWithSha.data[updatedDynamicData.id]?.[key as keyof DynamicFragranceData];
          if (value instanceof Set) return !(currentValue instanceof Set) || value.size !== currentValue.size || [...value].some(v => !currentValue.has(v));
          if (value instanceof Date) return !(currentValue instanceof Date) || value.getTime() !== currentValue.getTime();
          return value !== currentValue;
        });

    if (actualDynamicDataChanges.length === 0) {
      return Promise.resolve({ data: { content: { sha: currentDynamicDataWithSha.sha } } });
    }

    const diff = { id: updatedDynamicData.id, ...Object.fromEntries(actualDynamicDataChanges) };
    const action = currentDynamicDataWithSha.data[updatedDynamicData.id] ? 'update' : 'add';

    return octokit.rest.repos.createOrUpdateFileContents({
      owner: session.owner,
      repo: session.repo,
      path: 'dynamic-fragrance-data.jsonl',
      message: `[app:${action}] ${JSON.stringify(diff)}`,
      content: encodedContent,
      sha: currentDynamicDataWithSha.sha,
    });
  }

  const mutation = useMutation({
    scope: { id: 'dynamic-fragrance-data' },
    mutationFn: async (updatedDynamicData: DynamicFragranceData) => saveDynamicFragranceData(updatedDynamicData),
    onError: (err: any) => {
      console.error('Failed to save fragrance:', err);
      queryClient.invalidateQueries({ queryKey: ['dynamic-fragrance-data'] });
    },
    onSuccess: (response: any, changedDynamicFragranceData: DynamicFragranceData) => {
      const newSha = response.data.content?.sha;
      if (newSha) {
        queryClient.setQueryData<{ data: Record<number, DynamicFragranceData>; sha: string; }>(['dynamic-fragrance-data'], (oldData) => {
          if (!oldData) return oldData;
          return { ...oldData, data: { ...oldData.data, [changedDynamicFragranceData.id]: changedDynamicFragranceData }, sha: newSha };
        });
      }

      // clear pending state for this id
      setPendingData(prev => {
        const { [changedDynamicFragranceData.id]: _, ...rest } = prev;
        return rest;
      });
      pendingDataRef.current.delete(changedDynamicFragranceData.id);
    },
  });

  // pending buffer + timers (hidden implementation detail)
  const debounceTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingDataRef = useRef(new Map<number, DynamicFragranceData>());
  const [pendingData, setPendingData] = useState<Record<number, DynamicFragranceData>>({});

  const debouncedMutate = useCallback((updatedDynamicData: DynamicFragranceData, delay: number = DEBOUNCE_DELAY_MS) => {
    const fragranceId = updatedDynamicData.id;
    pendingDataRef.current.set(fragranceId, updatedDynamicData);
    setPendingData(prev => ({ ...prev, [fragranceId]: updatedDynamicData }));

    const existingTimer = debounceTimersRef.current.get(fragranceId);
    if (existingTimer) window.clearTimeout(existingTimer as unknown as number);

    const newTimer = window.setTimeout(() => {
      const dataToSave = pendingDataRef.current.get(fragranceId);
      if (dataToSave) {
        mutation.mutate(dataToSave);
        pendingDataRef.current.delete(fragranceId);
      }
      debounceTimersRef.current.delete(fragranceId);
    }, delay);

    debounceTimersRef.current.set(fragranceId, newTimer as unknown as ReturnType<typeof setTimeout>);
  }, []);

  // flush on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach(timer => clearTimeout(timer));
      pendingDataRef.current.forEach(data => mutation.mutate(data));
      debounceTimersRef.current.clear();
      pendingDataRef.current.clear();
    };
  }, []);

  // keep prev ref for identity reuse
  const fragrancesRef = useRef<Record<number, Fragrance> | undefined>(undefined);

  // compute merged fragrances and preserve references when unchanged
  const fragrances = useMemo(() => {
    const staticData = staticQuery.data?.data;
    const dynamicData = dynamicQuery.data?.data;
    if (!staticData || !dynamicData) return undefined;

    const combined: Record<number, Fragrance> = {};

    for (const id in {...dynamicData, ...pendingData}) {
      const newFragrance = { ...dynamicData[id], ...(pendingData[id] ?? {}) , ...(staticData[id] ?? {}) } as Fragrance;
      if (fragrancesRef.current?.[id] && JSON.stringify(fragrancesRef.current[id]) === JSON.stringify(newFragrance)) {
        combined[id] = fragrancesRef.current[id];
      } else {
        combined[id] = newFragrance;
      }
    }

    fragrancesRef.current = combined;

    return combined;
  }, [staticQuery.data, dynamicQuery.data, pendingData]);

  return {
    query: {
      fragrances: fragrances,
      error: dynamicQuery.error ?? staticQuery.error,
      isPending: dynamicQuery.isPending || staticQuery.isPending,
    },
    mutation: {
      error: mutation.error,
      isPending: mutation.isPending,
      saveDynamicFragranceData: debouncedMutate,
      saveDynamicFragranceDataNow: (d: DynamicFragranceData) => debouncedMutate(d, 0),
    },
  };
}
