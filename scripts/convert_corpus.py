"""Convert FM Abhaya ASCII pages in grade11_science_corpus.json to Unicode."""

from __future__ import annotations

import json
import re
from pathlib import Path

from pandukabhaya import Converter

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "grade11_science_corpus.json"

ENGLISH_HINT = re.compile(
    r"\b(the|and|of|to|for|science|department|question|answer|paper|examination)\b",
    re.I,
)
FM_HINT = re.compile(r"[;%]|wOH|fYa|oHd|mgl|fld|ms<s|wdh;|wOHdm")
SINHALA = re.compile(r"[\u0D80-\u0DFF]")


def should_convert(text: str) -> bool:
    if SINHALA.search(text):
        return False
    english = len(ENGLISH_HINT.findall(text))
    fm = len(FM_HINT.findall(text))
    return fm >= 2 and english < 10


def main() -> None:
    rows = json.loads(CORPUS.read_text(encoding="utf-8"))
    converter = Converter("fm_abhaya")
    converted = 0
    sinhala_before = 0
    sinhala_after = 0

    for row in rows:
        text = row.get("content") or ""
        sinhala_before += len(SINHALA.findall(text))
        if should_convert(text):
            row["content"] = converter.convert(text)
            row["encoding"] = "fm_abhaya_unicode"
            converted += 1
        else:
            row["encoding"] = "original"
        sinhala_after += len(SINHALA.findall(row["content"]))

    CORPUS.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    report = ROOT / "_corpus_convert_report.txt"
    report.write_text(
        "\n".join(
            [
                f"records={len(rows)}",
                f"converted={converted}",
                f"sinhala_before={sinhala_before}",
                f"sinhala_after={sinhala_after}",
            ]
        ),
        encoding="utf-8",
    )
    print(f"converted {converted}/{len(rows)} pages")


if __name__ == "__main__":
    main()
