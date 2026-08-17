// Precompute multilingual embeddings for ingredient names (EN + FR).
// Output: public/embeddings.bin - Float32 row-major matrix, 2N x DIM
//   row i     = embedding of ingredients[i].en
//   row N + i = embedding of ingredients[i].fr
// The server (server/main.py) encodes the query with the exact same model
// (quantized q8 ONNX); the browser ranks by cosine similarity (normalized).
import { pipeline } from "@huggingface/transformers";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const DIM = 384;

const data = JSON.parse(readFileSync(join(ROOT, "public/data.json"), "utf8"));
const ings = data.ingredients;
const texts = [...ings.map((i) => i.en), ...ings.map((i) => i.fr)];

console.log(`embedding ${texts.length} names (${ings.length} ingredients) with ${MODEL}...`);
const extractor = await pipeline("feature-extraction", MODEL, { dtype: "q8" });

const out = new Float32Array(texts.length * DIM);
const BATCH = 32;
for (let i = 0; i < texts.length; i += BATCH) {
  const batch = texts.slice(i, i + BATCH);
  const res = await extractor(batch, { pooling: "mean", normalize: true });
  out.set(res.data, i * DIM);
  process.stdout.write(`\r  ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
}
console.log();

writeFileSync(join(ROOT, "public/embeddings.bin"), Buffer.from(out.buffer));
writeFileSync(
  join(ROOT, "public/embeddings.json"),
  JSON.stringify({ model: MODEL, dim: DIM, n: ings.length })
);
console.log(`wrote public/embeddings.bin (${(out.byteLength / 1024).toFixed(0)} KB)`);
