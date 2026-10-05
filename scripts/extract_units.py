"""Pull Grade 11 Science unit titles from converted textbook / guide pages."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / "grade11_science_corpus.json").read_text(encoding="utf-8"))

HEADING = re.compile(
    r"(?:^|\n)(\d{1,2})\.(\d{1,2})(?:\.\d{1,2})?\s*([^\n]{4,60})"
)
CHAPTER = re.compile(
    r"(?:^|\n)(\d{1,2})\s*\n([^\n]{4,50})"
)
GUIDE = re.compile(
    r"(\d)\.(\d)\s*([^\n]{6,80})"
)

junk = re.compile(r"[A-Za-z]{8,}|www\.|isbn|ෂීඊභ|ෘඍ", re.I)


def clean(title: str) -> str:
    title = re.sub(r"\s+", " ", title).strip(" :-•")
    title = re.sub(r":[^\s]{3,}", "", title)
    return title[:70].strip()


units: dict[str, dict] = {}

for row in rows:
    if row["doc_type"] not in {"textbook", "teachers_guide"}:
        continue
    text = row["content"]
    for match in HEADING.finditer(text):
        title = clean(match.group(3))
        if junk.search(title) or len(re.findall(r"[\u0D80-\u0DFF]", title)) < 3:
            continue
        key = f"{match.group(1)}.{match.group(2)}"
        units.setdefault(
            key,
            {
                "id": f"ol-sci-g11-{match.group(1)}-{match.group(2)}",
                "chapter": int(match.group(1)),
                "section": int(match.group(2)),
                "title": title,
                "topics": [],
            },
        )
        if title not in units[key]["topics"] and title != units[key]["title"]:
            units[key]["topics"].append(title)

ordered = sorted(units.values(), key=lambda row: (row["chapter"], row["section"]))
for unit in ordered:
    unit["minutes"] = 40
    unit["topics"] = [unit["title"], *unit["topics"][:5]]

out = {
    "grade": 11,
    "subject": "Science",
    "units": [
        {
            "id": row["id"],
            "title": row["title"],
            "minutes": row["minutes"],
            "topics": row["topics"],
        }
        for row in ordered
    ],
}
path = ROOT / "data" / "syllabus" / "grade11-science-units.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
report = ROOT / "_g11_units.txt"
report.write_text(
    "\n".join(f"{u['id']} | {u['title']}" for u in out["units"]),
    encoding="utf-8",
)
print(f"units={len(out['units'])}")
