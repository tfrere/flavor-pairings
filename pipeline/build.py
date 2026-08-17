"""Build app/data.json from raw sources.

Inputs (DATA_DIR, default /tmp/foodatlas):
- recipes_*.parquet : RecipeNLG mirror shards (NER ingredient lists)
- foodb_2020_04_07_csv/ : Food.csv, Content.csv, Compound.csv, CompoundsFlavor.csv, Flavor.csv

Output: ../app/data.json
"""
import collections
import glob
import itertools
import json
import math
import os
import re
import sys

import pandas as pd

from corpus import INGREDIENTS, MERGES, FOODB_ALIASES, FLAVOR_FR, canonical

DATA_DIR = os.environ.get("DATA_DIR", "/tmp/foodatlas")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data.json")

FINALS = list(INGREDIENTS.keys())
final_idx = {name: i for i, name in enumerate(FINALS)}
print(f"corpus: {len(FINALS)} ingredients")

# ---------------------------------------------------------------- recipes
print("\n[1/4] recipe co-occurrence ...")


def to_final(raw: str):
    c = canonical(raw.strip().lower())
    c = MERGES.get(c, c)
    return c if c in final_idx else None


ing_recipes = collections.Counter()
pair_cooc = collections.Counter()
n_recipes = 0
for f in sorted(glob.glob(os.path.join(DATA_DIR, "recipes_*.parquet"))):
    df = pd.read_parquet(f, columns=["NER"])
    for ner in df.NER.dropna():
        finals = sorted({m for i in ner.split(",") if (m := to_final(i))})
        n_recipes += 1
        ing_recipes.update(finals)
        if len(finals) >= 2:
            pair_cooc.update(itertools.combinations(finals, 2))
print(f"  {n_recipes} recipes, {len(pair_cooc)} raw pairs")

npmi = {}
for (a, b), c in pair_cooc.items():
    if c < 5:
        continue
    pa, pb, pab = ing_recipes[a] / n_recipes, ing_recipes[b] / n_recipes, c / n_recipes
    v = math.log(pab / (pa * pb)) / -math.log(pab)
    npmi[(a, b)] = v
print(f"  {len(npmi)} pairs with >=5 co-occurrences")

# ---------------------------------------------------------------- foodb profiles
print("\n[2/4] FooDB molecular profiles ...")
fdb_dir = os.path.join(DATA_DIR, "foodb_2020_04_07_csv")
food = pd.read_csv(os.path.join(fdb_dir, "Food.csv"))[["id", "name", "name_scientific"]]


def norm(s):
    s = str(s).lower()
    s = re.sub(r"[^a-z() ]", " ", s)
    return " ".join(s.split())


fdb_index = collections.defaultdict(set)
for _, r in food.iterrows():
    for n in [r["name"], r["name_scientific"]]:
        if isinstance(n, str) and n.strip():
            fdb_index[norm(n)].add(int(r["id"]))

content = pd.read_csv(
    os.path.join(fdb_dir, "Content.csv"),
    usecols=["source_id", "source_type", "food_id", "standard_content"],
    low_memory=False,
)
content = content[content.source_type == "Compound"]
content = content[pd.to_numeric(content.standard_content, errors="coerce").fillna(0) > 0]
fdb_food_chems = content.groupby("food_id").source_id.apply(set).to_dict()


def fdb_profile(ing):
    cands = [norm(FOODB_ALIASES[ing])] if ing in FOODB_ALIASES else []
    cands += [norm(ing), norm(ing) + "s"]
    if len(ing.split()) > 1:
        cands.append(norm(ing.split()[-1]))
    for c in cands:
        if c in fdb_index:
            chems = set()
            for fid in fdb_index[c]:
                chems |= fdb_food_chems.get(fid, set())
            if chems:
                return chems
    return set()


profiles = {ing: fdb_profile(ing) for ing in FINALS}
weak = [i for i, p in profiles.items() if len(p) < 10]
print(f"  ingredients with <10 measured compounds before FoodAtlas fallback: {len(weak)}")

# FoodAtlas fallback: translate FA chemical profiles into FooDB compound ids by name
if weak:
    comp_by_name = {}
    comp_names_df = pd.read_csv(
        os.path.join(fdb_dir, "Compound.csv"), usecols=["id", "name"], low_memory=False
    )
    for _, r in comp_names_df.iterrows():
        if isinstance(r["name"], str):
            comp_by_name.setdefault(r["name"].strip().lower(), int(r["id"]))

    ent = pd.read_parquet(os.path.join(DATA_DIR, "foodatlas-v4.8", "entities.parquet"))
    tri = pd.read_parquet(os.path.join(DATA_DIR, "foodatlas-v4.8", "triplets.parquet"))
    fa_foods = ent[ent.entity_type == "food"]
    fa_contains = tri[tri.relationship_id == "r1"]
    fa_food_chems = fa_contains.groupby("head_id").tail_id.apply(set).to_dict()
    fa_chem_name = ent[ent.entity_type == "chemical"].set_index("foodatlas_id").common_name.to_dict()

    fa_index = collections.defaultdict(set)
    for _, r in fa_foods.iterrows():
        names = [r.common_name] + (json.loads(r.synonyms) if r.synonyms else [])
        for n in names:
            nn = re.sub(r"\([^)]*\)|\bfood product\b", "", n.lower())
            nn = " ".join(re.sub(r"[^a-z ]", " ", nn).split())
            if nn:
                fa_index[nn].add(r.foodatlas_id)

    rescued = 0
    for ing in weak:
        cands = [ing, ing + "s"]
        fids = set()
        for c in cands:
            fids |= fa_index.get(c, set())
        fa_chems = set()
        for f in fids:
            fa_chems |= fa_food_chems.get(f, set())
        translated = {
            comp_by_name[fa_chem_name[c].strip().lower()]
            for c in fa_chems
            if c in fa_chem_name and fa_chem_name[c].strip().lower() in comp_by_name
        }
        if translated:
            profiles[ing] |= translated
            rescued += 1
    print(f"  FoodAtlas fallback applied to {rescued} ingredients")

still_weak = [(i, len(p)) for i, p in profiles.items() if len(p) < 10]
print(f"  still <10 compounds: {len(still_weak)}")
for i, n in sorted(still_weak, key=lambda x: x[1]):
    print(f"    {i}: {n}")

# ---------------------------------------------------------------- flavors
print("\n[3/4] compound flavor descriptors ...")
flavor = pd.read_csv(os.path.join(fdb_dir, "Flavor.csv"))[["id", "name"]]
cf = pd.read_csv(os.path.join(fdb_dir, "CompoundsFlavor.csv"))[["compound_id", "flavor_id"]]
flavor_name = flavor.set_index("id")["name"].str.lower().to_dict()
comp_flavors = cf.groupby("compound_id").flavor_id.apply(list).to_dict()

compound_names = pd.read_csv(
    os.path.join(fdb_dir, "Compound.csv"), usecols=["id", "name"], low_memory=False
).set_index("id")["name"].to_dict()

BORING_FLAVORS = {
    "odorless", "bland", "tasteless", "mild", "characteristic", "pleasant",
    "aromatic", "faint", "slight", "slightly waxy", "sweat", "weak", "strong",
    "powerful", "heavy", "diffusive", "penetrating", "agreeable", "peculiar",
    "very mild", "unpleasant", "dirty", "urine", "sickening", "disagreeable",
    "nauseating", "obnoxious", "repulsive",
}

# IDF weights: distinctive flavors matter more than ubiquitous ones (bitter, fatty...)
flavor_df = cf.groupby("flavor_id").compound_id.nunique().to_dict()


def flavor_idf(fid):
    return 1.0 / math.log(4 + flavor_df.get(fid, 1))

# ---------------------------------------------------------------- pairs
print("\n[4/4] scoring pairs ...")

# Compound rarity across ingredient profiles: rare shared compounds are the
# distinctive ones (esters, terpenes), ubiquitous ones (fatty acids, sugars) are not.
comp_df = collections.Counter()
for p in profiles.values():
    comp_df.update(p)


def comp_rarity(cid):
    return 1.0 / math.log(1.5 + comp_df.get(cid, 1))


all_pairs = {}
for i, a in enumerate(FINALS):
    for b in FINALS[i + 1:]:
        key = (a, b) if (a, b) in npmi else (b, a)
        r = npmi.get(key)
        pa, pb = profiles[a], profiles[b]
        inter = pa & pb
        j = len(inter) / len(pa | pb) if (pa or pb) else 0.0
        cooc = pair_cooc.get((a, b), 0) + pair_cooc.get((b, a), 0)
        if r is None and len(inter) < 5:
            continue
        # shared aromatic compounds, ranked by rarity (distinctive first)
        flavored = [(c, comp_flavors.get(c, [])) for c in inter]
        flavored = [(c, fl) for c, fl in flavored if fl and isinstance(compound_names.get(c), str)]
        flavored.sort(key=lambda x: -comp_rarity(x[0]))
        top_comps = [c for c, _ in flavored[:6]]
        tag_counter = collections.Counter()
        for c, fl in flavored:
            w = comp_rarity(c)
            for fid in fl:
                name = flavor_name.get(fid, "")
                if name and name not in BORING_FLAVORS:
                    tag_counter[name] += w * flavor_idf(fid)
        tags = [t for t, _ in tag_counter.most_common(5)]
        all_pairs[(a, b)] = {
            "r": r if r is not None else None,
            "j": j,
            "cooc": cooc,
            "nshared": len(inter),
            "comps": top_comps,
            "tags": tags,
        }
print(f"  {len(all_pairs)} scored pairs")

# global percentile normalization for slider blending
r_vals = sorted(v["r"] for v in all_pairs.values() if v["r"] is not None)
j_vals = sorted(v["j"] for v in all_pairs.values() if v["j"] > 0)


def pct(sorted_vals, x):
    if x is None or not sorted_vals:
        return 0
    lo, hi = 0, len(sorted_vals)
    while lo < hi:
        mid = (lo + hi) // 2
        if sorted_vals[mid] <= x:
            lo = mid + 1
        else:
            hi = mid
    return round(1000 * lo / len(sorted_vals))


# ---------------------------------------------------------------- serialize
used_comps, used_tags = set(), set()
for v in all_pairs.values():
    used_comps.update(v["comps"])
    used_tags.update(v["tags"])
comp_list = sorted(used_comps)
comp_idx = {c: i for i, c in enumerate(comp_list)}
tag_list = sorted(used_tags)
tag_idx = {t: i for i, t in enumerate(tag_list)}

pairs_out = []
for (a, b), v in all_pairs.items():
    pairs_out.append([
        final_idx[a], final_idx[b],
        pct(r_vals, v["r"]), pct(j_vals, v["j"] if v["j"] > 0 else None),
        v["cooc"], v["nshared"],
        [comp_idx[c] for c in v["comps"]],
        [tag_idx[t] for t in v["tags"]],
    ])

data = {
    "ingredients": [
        {
            "en": ing,
            "fr": INGREDIENTS[ing][0],
            "cat": INGREDIENTS[ing][1],
            "nrec": ing_recipes.get(ing, 0),
            "nmol": len(profiles[ing]),
        }
        for ing in FINALS
    ],
    "molecules": [str(compound_names.get(c, c)) for c in comp_list],
    "tags": [{"en": t, "fr": FLAVOR_FR.get(t, t)} for t in tag_list],
    "pairs": pairs_out,
    "meta": {
        "n_recipes": n_recipes,
        "sources": "RecipeNLG, FooDB 2020-04-07, FoodAtlas v4.8",
    },
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
print(f"\nwrote {OUT} ({os.path.getsize(OUT)/1e6:.1f} MB)")
