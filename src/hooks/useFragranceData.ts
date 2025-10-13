import { useMemo } from 'react';
import { Octokit } from 'octokit';
import { useQuery } from '@tanstack/react-query';
import { parseDynamicFragranceData, parseStaticFragranceData, type DynamicFragranceData, type StaticFragranceData } from '../types';

export function useFragranceData(session: any) {
  // create octokit for this session
  const octokit = useMemo(() => new Octokit({ auth: session.accessToken }), [session]);

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

  const staticQuery = useQuery<{ data: Record<number, StaticFragranceData>; sha: string }, Error>({
    queryKey: ['static-fragrance-data'],
    queryFn: () => fetchAndParseJsonl<StaticFragranceData>('static-fragrance-data.jsonl', parseStaticFragranceData),
  });

  const dynamicQuery = useQuery<{ data: Record<number, DynamicFragranceData>; sha: string }, Error>({
    queryKey: ['dynamic-fragrance-data'],
    queryFn: () => fetchAndParseJsonl<DynamicFragranceData>('dynamic-fragrance-data.jsonl', parseDynamicFragranceData),
  });

  return {
    staticDataWithSha: staticQuery.data,
    staticData: staticQuery.data?.data,
    staticPending: staticQuery.isPending,
    staticError: staticQuery.error,
    dynamicDataWithSha: dynamicQuery.data,
    dynamicData: dynamicQuery.data?.data,
    dynamicPending: dynamicQuery.isPending,
    dynamicError: dynamicQuery.error,
    octokit,
  };
}
