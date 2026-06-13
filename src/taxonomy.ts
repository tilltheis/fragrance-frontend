import { normalize, type NormalizedFragrance } from './normalizeFragrances';

export interface Taxonomy {
  brands: { key: string; label: string; count: number }[];
  notes: { key: string; label: string; count: number }[];
  typeCounts: Map<string, number>;
}

export function buildTaxonomy(normalized: NormalizedFragrance[]): Taxonomy {
  const brandMap = new Map<string, { label: string; count: number }>();
  const noteMap = new Map<string, { labelCounts: Map<string, number>; count: number }>();
  const typeCounts = new Map<string, number>();

  for (const item of normalized) {
    const brandLabel = item.fragrance.brand ?? item.fragrance.brandQuery;
    const brandKey = normalize(brandLabel);
    const existing = brandMap.get(brandKey);
    if (existing) {
      existing.count++;
    } else {
      brandMap.set(brandKey, { label: brandLabel, count: 1 });
    }

    for (const { key, label } of item.displayNotes) {
      const existing = noteMap.get(key);
      if (existing) {
        existing.count++;
        const lc = existing.labelCounts.get(label) ?? 0;
        existing.labelCounts.set(label, lc + 1);
      } else {
        noteMap.set(key, { labelCounts: new Map([[label, 1]]), count: 1 });
      }
    }

    for (const [typeKey] of item.typePercentages) {
      typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + 1);
    }
  }

  const brands = Array.from(brandMap.entries())
    .map(([key, { label, count }]) => ({ key, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'));

  const notes = Array.from(noteMap.entries())
    .map(([key, { labelCounts, count }]) => {
      let bestLabel = key;
      let bestCount = 0;
      for (const [label, c] of labelCounts) {
        if (c > bestCount || (c === bestCount && label < bestLabel)) {
          bestLabel = label;
          bestCount = c;
        }
      }
      return { key, label: bestLabel, count };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'de'));

  return { brands, notes, typeCounts };
}
