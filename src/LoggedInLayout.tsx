import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    queryClient.setQueryData(['dynamic-fragrance-data'], (oldData: { data: Record<number, DynamicFragranceData>; sha: string; } | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: { ...oldData.data, [changedDynamicFragranceData.id]: changedDynamicFragranceData }
      };
    });
  }, [queryClient]);

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
