"""Build grade11_science_corpus.json from PDFs in data_raw/.

Install once:
    pip install pypdf
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from pandukabhaya import Converter
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data_raw"
OUTPUT_PATH = ROOT / "grade11_science_corpus.json"

GRADE = 11
SUBJECT = "science"

DOC_TYPE_RULES = (
    ("model_paper_answer", "model_paper_answer"),
    ("model_paper", "model_paper"),
    ("teachers_guide", "teachers_guide"),
    ("teacher_guide", "teachers_guide"),
    ("gurumarga", "teachers_guide"),
    ("pastpaper", "pastpaper"),
    ("past_paper", "pastpaper"),
    ("textbook", "textbook"),
)

HAS_CONTENT = re.compile(r"[\u0D80-\u0DFFa-zA-Z0-9]")
ENGLISH_HINT = re.compile(
    r"\b(the|and|of|to|for|science|department|question|answer|paper|examination)\b",
    re.I,
)
FM_HINT = re.compile(r"[;%]|wOH|fYa|oHd|mgl|fld|ms<s|wdh;|wOHdm")
SINHALA = re.compile(r"[\u0D80-\u0DFF]")
FM_CONVERTER = Converter("fm_abhaya")


def infer_doc_type(file_name: str) -> str:
    stem = Path(file_name).stem.lower()
    for needle, doc_type in DOC_TYPE_RULES:
        if needle in stem:
            return doc_type
    return re.sub(r"[_-]+\d+$", "", stem) or stem


def to_unicode(text: str) -> str:
    if SINHALA.search(text):
        return text
    english = len(ENGLISH_HINT.findall(text))
    fm = len(FM_HINT.findall(text))
    if fm >= 2 and english < 10:
        return FM_CONVERTER.convert(text)
    return text


def page_text(page) -> str:
    raw = page.extract_text() or ""
    text = raw.replace("\x00", "").replace("\r", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    return to_unicode(text.strip())


def is_empty(text: str) -> bool:
    return not HAS_CONTENT.search(text)


def pdf_paths() -> list[Path]:
    files = sorted(RAW_DIR.glob("*.pdf"), key=lambda path: path.name.lower())
    if not files:
        raise SystemExit(f"No PDF files found in {RAW_DIR}")
    return files


def main() -> None:
    files = pdf_paths()
    records: list[dict] = []

    print(f"Found {len(files)} PDF(s) in {RAW_DIR}")
    for file_index, path in enumerate(files, start=1):
        print(f"\n[{file_index}/{len(files)}] Reading {path.name}")
        reader = PdfReader(str(path))
        total_pages = len(reader.pages)
        kept = 0
        doc_type = infer_doc_type(path.name)

        for page_number, page in enumerate(reader.pages, start=1):
            print(
                f"  page {page_number}/{total_pages}",
                end="\r",
                flush=True,
            )
            text = page_text(page)
            if is_empty(text):
                continue
            kept += 1
            records.append(
                {
                    "file_name": path.name,
                    "doc_type": doc_type,
                    "grade": GRADE,
                    "subject": SUBJECT,
                    "page_number": page_number,
                    "content": text,
                }
            )

        print(f"  page {total_pages}/{total_pages} — kept {kept} pages   ")

    OUTPUT_PATH.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nSaved {len(records)} pages -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
