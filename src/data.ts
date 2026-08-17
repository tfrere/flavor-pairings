import { useEffect, useMemo, useState } from "react";
import type { PairData, Partner } from "./types";

export function usePairData() {
  const [data, setData] = useState<PairData | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then((r) => r.json())
      .then(setData);
  }, []);

  const byIng = useMemo(() => {
    if (!data) return [];
    const idx: Partner[][] = data.ingredients.map(() => []);
    for (const [a, b, r, m, cooc, nShared, comps, tags] of data.pairs) {
      idx[a].push({ other: b, r, m, cooc, nShared, comps, tags });
      idx[b].push({ other: a, r, m, cooc, nShared, comps, tags });
    }
    return idx;
  }, [data]);

  return { data, byIng };
}

/** weight in [0,1]: 0 = full tradition (recipes), 1 = full chemistry (molecules) */
export function blend(weight: number, p: Partner): number {
  return Math.round((1 - weight) * p.r + weight * p.m);
}

export function topPartners(
  byIng: Partner[][],
  i: number,
  weight: number,
  exclude: Set<number>,
  n = 18,
): (Partner & { score: number })[] {
  return byIng[i]
    .filter((p) => !exclude.has(p.other))
    .map((p) => ({ ...p, score: blend(weight, p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
