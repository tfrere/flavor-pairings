// Multilingual semantic search over ingredient names.
// The query is embedded server-side (POST /api/embed, same quantized q8 model
// that produced the corpus vectors); ingredient vectors are precomputed by
// pipeline/embed.mjs into embeddings.bin (EN rows then FR rows, normalized)
// and ranked here by cosine similarity.
const DIM = 384;

let loadPromise: Promise<void> | null = null;
let vectors: Float32Array | null = null;
let count = 0;
const queryCache = new Map<string, Float32Array>();

export function isReady(): boolean {
  return vectors !== null;
}

/** Fetch the corpus vectors and warm the embedding API; safe to call many times. */
export function preload(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const base = import.meta.env.BASE_URL;
      fetch(`${base}api/health`).catch(() => {}); // wake the server early
      const bin = await fetch(`${base}embeddings.bin`).then((r) => r.arrayBuffer());
      vectors = new Float32Array(bin);
      count = vectors.length / DIM / 2;
    })().catch((e) => {
      loadPromise = null;
      throw e;
    });
  }
  return loadPromise;
}

async function embed(texts: string[]): Promise<Float32Array> {
  const key = texts.join("\u0000");
  const cached = queryCache.get(key);
  if (cached) return cached;

  const res = await fetch(`${import.meta.env.BASE_URL}api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`embed API ${res.status}`);
  const { vectors: rows } = (await res.json()) as { vectors: number[][] };
  const flat = new Float32Array(rows.length * DIM);
  rows.forEach((row, i) => flat.set(row, i * DIM));

  if (queryCache.size > 200) queryCache.clear();
  queryCache.set(key, flat);
  return flat;
}

function dot(q: Float32Array, row: number): number {
  const off = row * DIM;
  let s = 0;
  for (let k = 0; k < DIM; k++) s += q[k] * vectors![off + k];
  return s;
}

export interface SemanticResult {
  ranked: { index: number; sim: number }[];
  /** top1 minus median similarity: how isolated the best hit is. Low margin
   * means the query is out-of-vocabulary and similarities are just noise. */
  margin: number;
}

/**
 * Ranked ingredient indices by max cosine similarity over EN/FR names.
 *
 * The model is case-sensitive (e.g. German nouns are capitalized: "Erdbeere"
 * matches strawberry at 0.91 while "erdbeere" degenerates into a vector close
 * to everything). We embed several case variants and keep the one whose best
 * hit stands out most from the background (largest top1-median margin).
 */
export async function semanticRank(query: string): Promise<SemanticResult> {
  if (!isReady()) await preload();
  const variants = [...new Set([
    query,
    query.toLowerCase(),
    query.charAt(0).toUpperCase() + query.slice(1).toLowerCase(),
  ])];
  const qs = await embed(variants);

  let best: { index: number; sim: number }[] = [];
  let bestMargin = -1;
  for (let v = 0; v < variants.length; v++) {
    const q = qs.subarray(v * DIM, (v + 1) * DIM);
    const scored: { index: number; sim: number }[] = [];
    for (let i = 0; i < count; i++) {
      scored.push({ index: i, sim: Math.max(dot(q, i), dot(q, count + i)) });
    }
    scored.sort((a, b) => b.sim - a.sim);
    const margin = scored[0].sim - scored[Math.floor(scored.length / 2)].sim;
    if (margin > bestMargin) {
      bestMargin = margin;
      best = scored;
    }
  }
  return { ranked: best, margin: bestMargin };
}
