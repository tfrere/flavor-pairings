---
title: Flavor Pairings
emoji: 🍓
colorFrom: red
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
short_description: Ingredient pairing explorer - recipes vs molecules
---

# Flavor Pairings

Ingredient pairing explorer. For any of 238 curated ingredients, find what goes
well with it along two complementary signals:

- **Tradition score**: normalized co-occurrence (NPMI) of the two ingredients
  across ~500,000 real recipes (RecipeNLG corpus). The collective wisdom of cooks.
- **Chemistry score**: fraction of shared measured aroma/taste molecules between
  the two ingredients (FooDB measured contents, FoodAtlas knowledge graph). The
  food-pairing hypothesis: ingredients sharing flavor molecules may work
  together even if nobody dared yet.

A slider blends the two rankings. Each pairing can be opened to see the shared
molecules (ranked by distinctiveness) and the aroma descriptors they carry.

## Stack

React 18 + Vite + Material UI (v6, CSS variables theme, light only), served
by a small FastAPI backend (Docker Space) that also embeds search queries.

- **Multilingual semantic search**: ingredient names are embedded offline
  (`pipeline/embed.mjs`, paraphrase-multilingual-MiniLM-L12-v2); the server
  (`server/main.py`) embeds the query with the same quantized q8 ONNX model
  (POST `/api/embed`) and the browser ranks by cosine similarity against the
  precomputed vectors. Search works in ~50 languages with no heavy client
  download (the in-browser model was ~160 MB).
- **Illustrations**: 238 vintage botanical-plate style images, square 1:1
  with white backgrounds blended into the page via `mix-blend-mode: multiply`
  (`pipeline/slice_sheet4.py`, `pipeline/whiten_bg.py`).

```
npm install
uvicorn server.main:app --port 8000   # embedding API (vite proxies /api to it)
npm run dev                           # local dev server
npm run build                         # type-check + build to dist/
```

## Data pipeline

Everything is precomputed into a single `data.json` (~1.7 MB); the only
runtime backend work is embedding the search query.

The pipeline lives in `pipeline/`:

- `corpus.py`: curated corpus of 238 canonical ingredients (variant merging
  rules, FooDB aliases, French translations, category labels)
- `build.py`: computes recipe co-occurrence NPMI, molecular profiles
  (FooDB measured compounds, with FoodAtlas name-mapped fallback), shared-
  molecule statistics with IDF-weighted flavor descriptors, and serializes
  `data.json`

To rebuild, place the raw sources in `DATA_DIR` (default `/tmp/foodatlas`):

```
# RecipeNLG mirror shards (parquet with NER column)
recipes_*.parquet
# FooDB 2020-04-07 CSV dump (https://foodb.ca/downloads)
foodb_2020_04_07_csv/{Food,Content,Compound,CompoundsFlavor,Flavor}.csv
# FoodAtlas bundle (https://www.foodatlas.ai/food-composition-downloads)
foodatlas-v4.8/{entities,triplets}.parquet
```

then run `python3 pipeline/build.py`.

## Sources & licenses

- [RecipeNLG](https://huggingface.co/datasets/mbien/recipe_nlg) (research corpus)
- [FooDB](https://foodb.ca) 2020-04-07 (open access)
- [FoodAtlas](https://www.foodatlas.ai) v4.8 (Apache-2.0)
- [Pyrfume](https://pyrfume.org) informed the aroma-descriptor approach

## Open source & deployment

The project is 100% open source, developed on
[GitHub](https://github.com/tfrere/flavor-pairings). Every push to `main`
automatically deploys to the
[Hugging Face Space](https://huggingface.co/spaces/tfrere/flavor-pairings)
via GitHub Actions (`.github/workflows/deploy-to-space.yml`).

Built as a weekend experiment in computational gastronomy.
