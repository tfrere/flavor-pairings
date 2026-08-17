"""Embedding API + static frontend server for the Flavor Pairings Space.

Runs the exact same quantized q8 ONNX model that used to run in the browser
(Xenova/paraphrase-multilingual-MiniLM-L12-v2), so the precomputed corpus
vectors in public/embeddings.bin stay valid byte-for-byte. Only the query is
embedded here; cosine ranking stays client-side against those vectors.
"""
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from huggingface_hub import hf_hub_download
from pydantic import BaseModel
from tokenizers import Tokenizer

MODEL_REPO = "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
MAX_TEXTS = 8
MAX_CHARS = 200

model_path = hf_hub_download(MODEL_REPO, "onnx/model_quantized.onnx")
tokenizer = Tokenizer.from_file(hf_hub_download(MODEL_REPO, "tokenizer.json"))
tokenizer.enable_truncation(max_length=64)
session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
input_names = {i.name for i in session.get_inputs()}

app = FastAPI(docs_url=None, redoc_url=None)


class EmbedRequest(BaseModel):
    texts: list[str]


@app.post("/api/embed")
def embed(req: EmbedRequest) -> dict:
    texts = [t.strip()[:MAX_CHARS] for t in req.texts if t.strip()]
    if not texts or len(texts) > MAX_TEXTS:
        raise HTTPException(422, f"expected 1-{MAX_TEXTS} non-empty texts")

    encodings = tokenizer.encode_batch(texts)
    max_len = max(len(e.ids) for e in encodings)
    ids = np.zeros((len(texts), max_len), dtype=np.int64)
    mask = np.zeros((len(texts), max_len), dtype=np.int64)
    for i, e in enumerate(encodings):
        ids[i, : len(e.ids)] = e.ids
        mask[i, : len(e.ids)] = e.attention_mask

    feeds = {"input_ids": ids, "attention_mask": mask}
    if "token_type_ids" in input_names:
        feeds["token_type_ids"] = np.zeros_like(ids)

    (hidden,) = session.run(None, feeds)  # (batch, seq, dim)
    # mean pooling over attention mask, then L2 normalize (same as
    # transformers.js `pooling: "mean", normalize: true`)
    m = mask[:, :, None].astype(np.float32)
    pooled = (hidden * m).sum(axis=1) / np.clip(m.sum(axis=1), 1e-9, None)
    pooled /= np.clip(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-9, None)
    return {"vectors": [v.tolist() for v in pooled]}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# mounted last so /api routes take precedence
app.mount("/", StaticFiles(directory=Path(__file__).parent.parent / "dist", html=True))
