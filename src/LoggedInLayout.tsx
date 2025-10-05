import { useQuery } from '@tanstack/react-query';
import { Octokit } from 'octokit';
import { useMemo, useState } from 'react';
import { AppearanceSelector } from './AppearanceSelector';
import { AuthForm } from './AuthForm';
import { useSession } from './AuthProvider';
import { type FragranceCardMode } from './FragranceCard';
import { FragranceCardModeSelector, getInitialFragranceCardMode } from './FragranceCardModeSelector';
import { FragranceGrid } from './FragranceGrid';
import unparsedFragrances from './fragrances.json';
import { parseFragrance, type Fragrance } from './types';

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

export function LoggedInLayout() {
  const session = useSession();
  const octokit = useMemo(() => new Octokit({ auth: session.accessToken }), [session]);

  const { data: fragrances, isPending, error } = useQuery<Record<number, Fragrance>>({
    queryKey: ['static-fragrance-data'],
    queryFn: async () => {
      const paths = ['static-fragrance-data.jsonl', 'dynamic-fragrance-data.jsonl'];
      const [staticData, dynamicData] = await Promise.all(paths.map(async (path) => {
        const { data } = await octokit.rest.repos.getContent({
          owner: session.owner,
          repo: session.repo,
          path,
        });

        if (!('content' in data) || typeof data.content !== 'string') {
          throw new Error(`${path}: Missing or invalid 'content' field in GitHub API response`);
        }

        const decodedContent = new TextDecoder('utf-8').decode(Uint8Array.from(atob(data.content), c => c.charCodeAt(0)));
        return decodedContent.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
      })) as [Record<string, any>[], Record<string, any>[]];

      const fragranceData =  [...dynamicData, ...staticData].reduce((acc, item) => {
        acc[item.id] = { ...(acc[item.id] ?? {}), ...item };
        return acc;
      }, {} as Record<number, Record<string, any>>);

      return Object.fromEntries(
        Object.entries(fragranceData).map(([id, value]) => [Number(id), parseFragrance(value)])
      );
    }
  });

  const [_fragrances, setFragrances] = useState<Record<number, Fragrance>>(
    () => DATA.reduce((acc, fragrance) => {
      acc[fragrance.id] = fragrance;
      return acc;
    }, {} as Record<number, Fragrance>)
  );

  const [cardMode, setCardMode] = useState<FragranceCardMode>(getInitialFragranceCardMode());

  let Content;
  if (isPending) {
    Content = () => <div className="text-fg-base">Lade Düfte...</div>;
  } else if (error) {
    Content = () => <div className="text-status-error-fg bg-status-error-bg border rounded p-2 border-status-error-border">Fehler beim Laden der Düfte: {error.message}</div>;
  } else {
    Content = () => <FragranceGrid fragrances={fragrances} cardMode={cardMode} />;
  }

  return (
    <div className="min-h-screen bg-nav-bg">
      <header className="max-w-7xl mx-auto px-4 py-4 md:flex md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-nav-fg">
            Duftsammlung
          </h1>
          <p className="text-fg-muted mt-1">
            {DATA.length} Düfte in der Sammlung
          </p>
        </div>
        <div className="flex gap-2">
          <AuthForm />
          <FragranceCardModeSelector value={cardMode} onChange={setCardMode} />
          <AppearanceSelector />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Content />
      </main>
    </div>
  );
}
