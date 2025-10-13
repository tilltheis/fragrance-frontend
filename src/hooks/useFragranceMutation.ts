import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DynamicFragranceData } from '../types';

const DEBOUNCE_DELAY_MS = 3000;

export function useFragranceMutation(session: any, octokit: any) {
  const queryClient = useQueryClient();

  async function saveDynamicFragranceData(updatedDynamicData: DynamicFragranceData) {
    console.log('Saving dynamic fragrance data:', updatedDynamicData);
    const currentDynamicDataWithSha = queryClient.getQueryData<{ data: Record<number, DynamicFragranceData>; sha: string }>(['dynamic-fragrance-data']);

    if (!currentDynamicDataWithSha) {
      throw new Error('No dynamic fragrance data in cache');
    }

    const updatedData = { ...currentDynamicDataWithSha.data, [updatedDynamicData.id]: updatedDynamicData };

    const jsonlContent = Object.values(updatedData)
      .sort((a, b) => a.id - b.id)
      .map(item => {
        const sortedItem = Object.fromEntries(
          Object.entries(item)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
              if (value instanceof Set || Array.isArray(value)) {
                return [key, [...value].sort()];
              }
              if (value instanceof Date) {
                return [key, value.toISOString()];
              }
              return [key, value];
            })
        );
        return JSON.stringify(sortedItem);
      })
      .join('\n');
    const encodedContent = btoa(String.fromCharCode(...new TextEncoder().encode(jsonlContent)));

    const actualDynamicDataChanges =
      Object.entries(updatedDynamicData)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .filter(([key, value]) => {
          const currentValue = currentDynamicDataWithSha.data[updatedDynamicData.id]?.[key as keyof DynamicFragranceData];
          if (value instanceof Set) {
            return !(currentValue instanceof Set) || value.size !== currentValue.size || [...value].some(v => !currentValue.has(v));
          }
          if (value instanceof Date) {
            return !(currentValue instanceof Date) || value.getTime() !== currentValue.getTime();
          }
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

  const updateFragranceMutation = useMutation({
    scope: { id: 'dynamic-fragrance-data' },
    mutationFn: async (updatedDynamicData: DynamicFragranceData) => saveDynamicFragranceData(updatedDynamicData),
    onError: (err) => {
      console.error('Failed to save fragrance:', err);
      queryClient.invalidateQueries({ queryKey: ['dynamic-fragrance-data'] });
    },
    onSuccess: (response: any, changedDynamicFragranceData: DynamicFragranceData) => {
      const newSha = response.data.content?.sha;
      if (newSha) {
        queryClient.setQueryData<{ data: Record<number, DynamicFragranceData>; sha: string; }>(['dynamic-fragrance-data'], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: { ...oldData.data, [changedDynamicFragranceData.id]: changedDynamicFragranceData },
            sha: newSha,
          };
        });
      }

      // clear pendingData state after success
      setPendingData(prev => {
        const { [changedDynamicFragranceData.id]: _, ...rest } = prev;
        return rest;
      });
    },
  });

  // Per-fragrance debouncing
  const debounceTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingDataRef = useRef(new Map<number, DynamicFragranceData>());

  const [pendingData, setPendingData] = useState<Record<number, DynamicFragranceData>>({});

  const debouncedSave = useCallback((updatedDynamicData: DynamicFragranceData, delay: number = DEBOUNCE_DELAY_MS) => {
    const fragranceId = updatedDynamicData.id;
    pendingDataRef.current.set(fragranceId, updatedDynamicData);
    setPendingData(prev => ({ ...prev, [fragranceId]: updatedDynamicData }));

    const existingTimer = debounceTimersRef.current.get(fragranceId);
    if (existingTimer) clearTimeout(existingTimer);

    const newTimer = setTimeout(() => {
      const dataToSave = pendingDataRef.current.get(fragranceId);
      if (dataToSave) {
        updateFragranceMutation.mutate(dataToSave);
        pendingDataRef.current.delete(fragranceId);
      }
      debounceTimersRef.current.delete(fragranceId);
    }, delay);

    debounceTimersRef.current.set(fragranceId, newTimer);
  }, []);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach(timer => clearTimeout(timer));
      pendingDataRef.current.forEach(data => updateFragranceMutation.mutate(data));
      debounceTimersRef.current.clear();
      pendingDataRef.current.clear();
    };
  }, []);

  return {
    debouncedSave,
    pendingData,
  };
}
