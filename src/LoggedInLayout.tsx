import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Octokit } from 'octokit';
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { AppearanceSelector } from './AppearanceSelector';
import { AuthForm } from './AuthForm';
import { useSession } from './AuthProvider';
import { type FragranceCardMode } from './FragranceCard';
import { FragranceCardModeSelector, getInitialFragranceCardMode } from './FragranceCardModeSelector';
import { FragranceGrid } from './FragranceGrid';
import { parseDynamicFragranceData, parseStaticFragranceData, toDynamicFragranceData, type DynamicFragranceData, type Fragrance, type StaticFragranceData } from './types';

const DEBOUNCE_DELAY_MS = 3000;

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
      console.log('No actual changes to save for fragrance id', updatedDynamicData.id);
      return Promise.resolve({ data: { content: { sha: currentDynamicDataWithSha.sha } } });
    }

    const diff = { id: updatedDynamicData.id, ...Object.fromEntries(actualDynamicDataChanges) };

    console.log('Saving dynamic fragrance data...', diff);

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
    onSuccess: (response: any, changedDynamicFragranceData: DynamicFragranceData) => {
      const newSha = response.data.content?.sha;
      if (newSha) {
        queryClient.setQueryData<{ data: Record<number, DynamicFragranceData>; sha: string; }>(['dynamic-fragrance-data'], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: { ...oldData.data, [changedDynamicFragranceData.id]: changedDynamicFragranceData },
            sha: newSha
          };
        });
      }

      setPendingData((prev) => {
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
    
    // Store the latest data for this fragrance
    pendingDataRef.current.set(fragranceId, updatedDynamicData);
    setPendingData((prev) => ({ ...prev, [fragranceId]: updatedDynamicData }));

    // Clear existing timer for this fragrance
    const existingTimer = debounceTimersRef.current.get(fragranceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer for this fragrance
    const newTimer = setTimeout(() => {
      const dataToSave = pendingDataRef.current.get(fragranceId);
      if (dataToSave) {
        updateFragranceMutation.mutate(dataToSave);
        pendingDataRef.current.delete(fragranceId);
      }
      debounceTimersRef.current.delete(fragranceId);
    }, delay);
    
    debounceTimersRef.current.set(fragranceId, newTimer);
  }, [updateFragranceMutation]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      debounceTimersRef.current.forEach(timer => clearTimeout(timer));
      
      // Save all pending changes immediately
      pendingDataRef.current.forEach(data => {
        updateFragranceMutation.mutate(data);
      });
      
      debounceTimersRef.current.clear();
      pendingDataRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on unmount

  const fragrancesRef = useRef<Record<number, Fragrance> | undefined>(undefined);
  (() => {
    if (!staticData || !dynamicData) {
      fragrancesRef.current = undefined;
      return;
    }

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
  })();
  const fragrances = fragrancesRef.current;

  const isPending = staticPending || dynamicPending;
  const error = staticError || dynamicError;

  const [cardMode, setCardMode] = useState<FragranceCardMode>(getInitialFragranceCardMode());

  const onChange = useCallback((changedDynamicFragranceData: DynamicFragranceData) => {
    debouncedSave(changedDynamicFragranceData);
  }, [queryClient, debouncedSave]);

  const [newBrandQuery, setNewBrandQuery] = useState('');
  const [newNameQuery, setNewNameQuery] = useState('');

  function handleCreateNewFragrance(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    const brandQuery = newBrandQuery.trim();
    const nameQuery = newNameQuery.trim();
    if (!brandQuery || !nameQuery) return;

    // Find next available id
    const allIds = [
      ...(staticData ? Object.keys(staticData) : []),
      ...(dynamicData ? Object.keys(dynamicData) : []),
    ].map(Number);
    const nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;

    const newDynamicFragrance: DynamicFragranceData = {
      id: nextId,
      brandQuery,
      nameQuery,
    };

    debouncedSave(newDynamicFragrance, 0);

    setNewBrandQuery('');
    setNewNameQuery('');
  }

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

      <form className="bg-card-bg p-6 rounded-lg shadow-lg w-80 border border-card-border text-card-fg">
        <div className="mb-6">
          <label className="block text-fg-base text-sm font-bold mb-2" htmlFor="newBrandQuery">
            Marke
          </label>
          <input
            className={`
              text-input-fg
              bg-input-bg
              border
              rounded
              border-input-border
              hover:border-input-hover-border
              w-full
              py-2
              px-3
              text-fg-base
              leading-tight
              focus:border-input-focus-border
              focus:outline-focus-ring
              focus-visible:ring-2
              focus-visible:ring-focus-ring
              focus-visible:ring-offset-1
              `}
            id="newBrandQuery"
            type="text"
            value={newBrandQuery}
            onChange={(e) => setNewBrandQuery(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block text-fg-base text-sm font-bold mb-2" htmlFor="newNameQuery">
            Name
          </label>
          <input
            className={`
              text-input-fg
              bg-input-bg
              border
              rounded
              border-input-border
              hover:border-input-hover-border
              w-full
              py-2
              px-3
              text-fg-base
              leading-tight
              focus:border-input-focus-border
              focus:outline-focus-ring
              focus-visible:ring-2
              focus-visible:ring-focus-ring
              focus-visible:ring-offset-1
              `}
            id="newNameQuery"
            type="text"
            value={newNameQuery}
            onChange={(e) => setNewNameQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="
              bg-button-primary-fill
              hover:bg-button-primary-hover
              active:bg-button-primary-active
              text-button-primary-fg
              border
              border-button-primary-border
              rounded
              font-bold
              py-2
              px-4
              rounded
              focus:outline-none
              focus:shadow-outline
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-focus-ring
              focus-visible:ring-offset-2
              ring-offset-card-bg
              "
            type="button"
            onClick={handleCreateNewFragrance}
          >
            Duft Hinzufügen
          </button>
        </div>
      </form>

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
