// Multilingual semantic search over ingredient names.
// The query is embedded in the browser with transformers.js (quantized q8,
// lazily loaded on first focus); ingredient vectors are precomputed by
// pipeline/embed.mjs into embeddings.bin (EN rows then FR rows, normalized).
const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const DIM = 384;

type Extractor = (
  text: string | string[],
  opts: { pooling: "mean"; normalize: boolean }
) => Promise<{ data: Float32Array }>;

let loadPromise: Promise<void> | null = null;
let extractor: Extractor | null = null;
let vectors: Float32Array | null = null;
let count = 0;

export function isReady(): boolean {
  return extractor !== null && vectors !== null;
}

/** Kick off model + vector download; safe to call many times. */
export function preload(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const base = import.meta.env.BASE_URL;
      const [{ pipeline }, bin] = await Promise.all([
        import("@huggingface/transformers"),
        fetch(`${base}embeddings.bin`).then((r) => r.arrayBuffer()),
      ]);
      vectors = new Float32Array(bin);
      count = vectors.length / DIM / 2;
      extractor = (await pipeline("feature-extraction", MODEL, {
        dtype: "q8",
      })) as unknown as Extractor;
    })().catch((e) => {
      loadPromise = null;
      throw e;
    });
  }
  return loadPromise;
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
  const { data: qs } = await extractor!(variants, { pooling: "mean", normalize: true });

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
