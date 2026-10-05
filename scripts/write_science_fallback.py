from pathlib import Path

p = Path("lib/daily-questions.ts")
text = p.read_text(encoding="utf-8")
cut = text.find("export function scienceDailyFallback")
if cut != -1:
    text = text[:cut].rstrip() + "\n"

def s(*codes: int) -> str:
    return "".join(chr(c) for c in codes)

# Built from code points so this script stays ASCII.
items = [
    {
        "id": "g11-sci-fb-1",
        "prompt": "Xylem (plant tissue) pradhana karya kumakda?",
        "options": [
            "Water and minerals move up",
            "Food moves only down",
            "It makes seeds",
            "It makes sound",
        ],
        "explanation": "Xylem carries water and minerals from roots to leaves.",
    },
    {
        "id": "g11-sci-fb-2",
        "prompt": "Photosynthesis walata awashya sadakayak kumakda?",
        "options": [
            "Chlorophyll and sunlight",
            "Salt and wind",
            "Iron and sound",
            "Ice and snow",
        ],
        "explanation": "Chlorophyll absorbs light so the plant can make food.",
    },
    {
        "id": "g11-sci-fb-3",
        "prompt": "Human circulation eke pump eka kumakda?",
        "options": ["Heart", "Liver", "Kidney", "Lung"],
        "explanation": "The heart pumps blood around the body.",
    },
    {
        "id": "g11-sci-fb-4",
        "prompt": "Acid ekaka pH agaya kohomada?",
        "options": ["Below 7", "Exactly 7", "Above 14", "Only 0"],
        "explanation": "Acids have pH below 7. 7 is neutral.",
    },
    {
        "id": "g11-sci-fb-5",
        "prompt": "Heat kiyanne kumakda?",
        "options": [
            "Energy that moves with temperature difference",
            "A colour",
            "A weight",
            "A sound",
        ],
        "explanation": "Heat is energy that moves from a hotter place to a colder place.",
    },
    {
        "id": "g11-sci-fb-6",
        "prompt": "Phloem patakaya gena yanne kumakda?",
        "options": ["Made food", "Only air", "Bone", "Blood"],
        "explanation": "Phloem carries food made in leaves to other parts.",
    },
]


def js_str(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


lines = [
    "",
    "export function scienceDailyFallback(): QuizQuestion[] {",
    "  return [",
]
for item in items:
    lines.append("    {")
    lines.append(f'      id: {js_str(item["id"])},')
    lines.append('      subject: "Science",')
    lines.append(f'      prompt: {js_str(item["prompt"])},')
    lines.append("      options: [")
    for option in item["options"]:
        lines.append(f"        {js_str(option)},")
    lines.append("      ],")
    lines.append("      answerIndex: 0,")
    lines.append(f'      explanation: {js_str(item["explanation"])},')
    lines.append("    },")
lines += ["  ];", "}", ""]

p.write_text(text + "\n".join(lines), encoding="utf-8")
print("wrote", len(items), "questions")
