"""Fetch 3D conformers (SDF) for every molecule referenced in data.json.

Chain: molecule name -> FooDB Compound.csv InChI -> PubChem CID -> 3D SDF.
Output: public/mol/{molecule_index}.sdf + public/mol/manifest.json listing
available indices. Fully static, no runtime PubChem dependency.

Uses curl (system certs) because this python build lacks SSL certificates.
"""
import csv
import json
import os
import subprocess
import sys
import time

ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA_DIR = os.environ.get("DATA_DIR", "/tmp/foodatlas")
OUT_DIR = os.path.join(ROOT, "public", "mol")
os.makedirs(OUT_DIR, exist_ok=True)

csv.field_size_limit(sys.maxsize)

data = json.load(open(os.path.join(ROOT, "public", "data.json")))
molecules = data["molecules"]

# name -> full InChI from FooDB (column is misnamed moldb_inchikey upstream)
name_to_inchi = {}
with open(os.path.join(DATA_DIR, "foodb_2020_04_07_csv", "Compound.csv")) as f:
    for row in csv.DictReader(f):
        n, k = row.get("name"), row.get("moldb_inchikey")
        if n and k and k.startswith("InChI="):
            name_to_inchi[n] = k

PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound"


def curl(args):
    res = subprocess.run(["curl", "-s", "--max-time", "30", *args], capture_output=True)
    return res.stdout


available = []
no_inchi, no_cid, no_3d = 0, 0, 0
for i, name in enumerate(molecules):
    out_path = os.path.join(OUT_DIR, f"{i}.sdf")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
        available.append(i)
        continue
    inchi = name_to_inchi.get(name)
    if not inchi:
        no_inchi += 1
        continue
    raw = curl(["-X", "POST", "--data-urlencode", f"inchi={inchi}", f"{PUG}/inchi/cids/JSON"])
    time.sleep(0.22)
    try:
        cid = json.loads(raw)["IdentifierList"]["CID"][0]
        assert cid
    except Exception:
        no_cid += 1
        continue
    sdf = curl([f"{PUG}/cid/{cid}/SDF?record_type=3d"])
    time.sleep(0.22)
    if sdf.startswith(b"{") or len(sdf) < 100:  # JSON error body or empty
        no_3d += 1
        continue
    with open(out_path, "wb") as f:
        f.write(sdf)
    available.append(i)
    if (i + 1) % 25 == 0:
        print(f"  {i + 1}/{len(molecules)} (ok={len(available)})", flush=True)

json.dump({"available": sorted(available)}, open(os.path.join(OUT_DIR, "manifest.json"), "w"))
print(f"done: {len(available)} SDF | no_inchi={no_inchi} no_cid={no_cid} no_3d={no_3d}")
