import json
from pathlib import Path

g11 = json.loads(
    Path("data/syllabus/grade11-science-units.json").read_text(encoding="utf-8")
)

payload = {
    "country": "LK",
    "name": "Grade 11 Science",
    "note": "Official 15 Grade 11 Science textbook lessons from පටුන, taught with textbook + teacher-guide pages.",
    "levels": [
        {
            "id": "ol",
            "name": "Grade 11 Science",
            "grades": ["Grade 11"],
            "subjects": [
                {
                    "id": "science",
                    "name": "Science",
                    "units": g11["units"],
                }
            ],
        }
    ],
}

out = Path("data/syllabus/sri-lanka.json")
out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("units", len(g11["units"]))
