import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Octokit } from 'octokit';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AppearanceSelector } from './AppearanceSelector';
import { AuthForm } from './AuthForm';
import { useSession } from './AuthProvider';
import { type FragranceCardMode } from './FragranceCard';
import { FragranceCardModeSelector, getInitialFragranceCardMode } from './FragranceCardModeSelector';
import { FragranceGrid } from './FragranceGrid';
import { parseDynamicFragranceData, parseStaticFragranceData, type DynamicFragranceData, type Fragrance, type StaticFragranceData } from './types';

function FragranceContent({
  isPending,
  error,
  fragrances,
  cardMode,
  onChange,
}: {
  isPending: boolean;
  error: Error | null | undefined;
  fragrances: Record<number, Fragrance> | undefined;
  cardMode: FragranceCardMode;
  onChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
}) {
  if (isPending || !fragrances) {
    return <div className="text-fg-base">Lade Düfte...</div>;
  }
  if (error) {
    return (
      <div className="text-status-error-fg bg-status-error-bg border rounded p-2 border-status-error-border">
        Fehler beim Laden der Düfte: {error.message}
      </div>
    );
  }
  if (Object.keys(fragrances).length === 0) {
    return <div className="text-fg-base">Keine Düfte gefunden.</div>;
  }
  return <FragranceGrid fragrances={fragrances} cardMode={cardMode} onChange={onChange} />;
}

const MemoizedFragranceContent = React.memo(FragranceContent);

export function LoggedInLayout() {
  const session = useSession();
  const octokit = useMemo(() => new Octokit({ auth: session.accessToken }), [session]);
  const queryClient = useQueryClient();

  async function fetchAndParseJsonl<T>( path: string, parser: (value: any) => T): Promise<{ data: Record<number, T>; sha: string }> {
    const { data } = await octokit.rest.repos.getContent({
      owner: session.owner,
      repo: session.repo,
      path,
    });
    if (!('content' in data) || typeof data.content !== 'string' || !('sha' in data)) {
      throw new Error(`${path}: Missing or invalid content or sha field in GitHub API response`);
    }
    const decodedContent = new TextDecoder('utf-8').decode(Uint8Array.from(atob(data.content), c => c.charCodeAt(0)));
    const items = decodedContent.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    const parsed: Record<number, T> = {};
    for (const item of items) {
      parsed[Number(item.id)] = parser(item);
    }
    return { data: parsed, sha: (data as any).sha };
  }

  const { data: staticDataWithSha, isPending: staticPending, error: staticError } = useQuery<{
    data: Record<number, StaticFragranceData>;
    sha: string;
  }>({
    queryKey: ['static-fragrance-data'],
    queryFn: () => fetchAndParseJsonl<StaticFragranceData>('static-fragrance-data.jsonl', parseStaticFragranceData),
  });
  const staticData = staticDataWithSha?.data;

  const { data: dynamicDataWithSha, isPending: dynamicPending, error: dynamicError } = useQuery<{
    data: Record<number, DynamicFragranceData>;
    sha: string;
  }>({
    queryKey: ['dynamic-fragrance-data'],
    queryFn: () => fetchAndParseJsonl<DynamicFragranceData>('dynamic-fragrance-data.jsonl', parseDynamicFragranceData),
  });
  const dynamicData = dynamicDataWithSha?.data;

  async function saveDynamicFragranceData(updatedDynamicData: DynamicFragranceData) {
    console.log('Saving dynamic fragrance data...', updatedDynamicData);
    const currentDynamicDataWithSha = queryClient.getQueryData<{
      data: Record<number, DynamicFragranceData>;
      sha: string;
    }>(['dynamic-fragrance-data']);

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

    return octokit.rest.repos.createOrUpdateFileContents({
      owner: session.owner,
      repo: session.repo,
      path: 'dynamic-fragrance-data.jsonl',
      message: `[app:update] { "id": ${updatedDynamicData.id} }`,
      content: encodedContent,
      sha: currentDynamicDataWithSha.sha,
    });
  }

  const updateFragranceMutation = useMutation({
    mutationFn: async (updatedDynamicData: DynamicFragranceData) => {
      return saveDynamicFragranceData(updatedDynamicData);
    },
    
    // Rollback on error
    onError: (err) => {
      console.error('Failed to save fragrance:', err);
      // Refetch to restore correct state
      queryClient.invalidateQueries({ queryKey: ['dynamic-fragrance-data'] });
    },
    
    // Update sha after successful save
    onSuccess: (response: any) => {
      const newSha = response.data.content?.sha;
      if (newSha) {
        queryClient.setQueryData<{
          data: Record<number, DynamicFragranceData>;
          sha: string;
        }>(['dynamic-fragrance-data'], (oldData) => {
          if (!oldData) return oldData;
          return { ...oldData, sha: newSha };
        });
      }
    },
  });

  // Per-fragrance debouncing
  const debounceTimers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingData = React.useRef(new Map<number, DynamicFragranceData>());
  
  const debouncedSave = useCallback((updatedDynamicData: DynamicFragranceData) => {
    const fragranceId = updatedDynamicData.id;
    
    // Store the latest data for this fragrance
    pendingData.current.set(fragranceId, updatedDynamicData);
    
    // Clear existing timer for this fragrance
    const existingTimer = debounceTimers.current.get(fragranceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer for this fragrance
    const newTimer = setTimeout(() => {
      const dataToSave = pendingData.current.get(fragranceId);
      if (dataToSave) {
        updateFragranceMutation.mutate(dataToSave);
        pendingData.current.delete(fragranceId);
      }
      debounceTimers.current.delete(fragranceId);
    }, 5000); // Wait 5 seconds after last edit for this fragrance
    
    debounceTimers.current.set(fragranceId, newTimer);
  }, [updateFragranceMutation]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      
      // Save all pending changes immediately
      pendingData.current.forEach(data => {
        updateFragranceMutation.mutate(data);
      });
      
      debounceTimers.current.clear();
      pendingData.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on unmount

  const [fragrances, setFragrances] = useState<Record<number, Fragrance> | undefined>();

  useEffect(() => {
    if (!staticData || !dynamicData) {
      setFragrances(undefined);
      return;
    }

    const combined: Record<number, Fragrance> = {};

    for (const id in dynamicData) {
      const newFragrance = { ...dynamicData[id], ...(staticData[id] ?? {}) } as Fragrance;
      if (fragrances?.[id] && JSON.stringify(fragrances[id]) === JSON.stringify(newFragrance)) {
        combined[id] = fragrances[id];
      } else {
        combined[id] = newFragrance;
      }
    }

    setFragrances(combined);
  }, [staticData, dynamicData]);

  const isPending = staticPending || dynamicPending;
  const error = staticError || dynamicError;

  const [cardMode, setCardMode] = useState<FragranceCardMode>(getInitialFragranceCardMode());

  const onChange = useCallback((changedDynamicFragranceData: DynamicFragranceData) => {
    // Immediately update cache optimistically
    queryClient.setQueryData(['dynamic-fragrance-data'], (oldData: { data: Record<number, DynamicFragranceData>; sha: string; } | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: { ...oldData.data, [changedDynamicFragranceData.id]: changedDynamicFragranceData }
      };
    });
    
    // Debounce the actual save
    debouncedSave(changedDynamicFragranceData);
  }, [queryClient, debouncedSave]);

  return (
    <div className="min-h-screen bg-nav-bg">
      <header className="max-w-7xl mx-auto px-4 py-4 md:flex md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-nav-fg">
            Duftsammlung
          </h1>
          <p className="text-fg-muted mt-1 h-6">
            {fragrances && `${Object.keys(fragrances).length} Düfte in der Sammlung`}
          </p>
        </div>
        <div className="flex gap-2">
          <AuthForm />
          <FragranceCardModeSelector value={cardMode} onChange={setCardMode} />
          <AppearanceSelector />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <MemoizedFragranceContent
          isPending={isPending}
          error={error}
          fragrances={fragrances}
          cardMode={cardMode}
          onChange={onChange}
        />
      </main>
    </div>
  );
}
