import json
from pathlib import Path

data = json.loads(Path("scripts/toc-structure.json").read_text(encoding="utf-8"))

compact = {
    "p1_first12": data["p1_first12"],
    "p2_toc_p12": data["p2_toc_p12"],
    "p1_sections": data["p1_sections"],
    "p2_sections": [
        s
        for s in data["p2_sections"]
        if s["code"].count(".") == 1 and not s["code"].endswith(".0")
    ],
}

Path("scripts/toc-compact.json").write_text(
    json.dumps(compact, ensure_ascii=True, indent=2), encoding="utf-8"
)
print("p1 first12 pages", len(compact["p1_first12"]))
print("p1 sections", len(compact["p1_sections"]))
print("p2 main sections", len(compact["p2_sections"]))
print("p2 toc lines", compact["p2_toc_p12"])
