import { normalize, type NormalizedFragrance } from './normalizeFragrances';

export function computeScores(
  normalized: NormalizedFragrance[],
  query: string,
): Map<number, number> {
  const scores = new Map<number, number>();
  if (!query) return scores;

  const nq = normalize(query);

  for (const item of normalized) {
    const { fragrance, normalizedBrand, normalizedName } = item;
    let score = 0;

    if (normalizedName === nq) {
      score = 6;
    } else if (normalizedBrand === nq) {
      score = 5;
    } else if (normalizedName.startsWith(nq)) {
      score = 4;
    } else if (normalizedBrand.startsWith(nq)) {
      score = 3;
    } else if (normalizedName.includes(nq)) {
      score = 2;
    } else if (normalizedBrand.includes(nq)) {
      score = 1;
    }

    if (score > 0) {
      scores.set(fragrance.id, score);
    }
  }

  return scores;
}
