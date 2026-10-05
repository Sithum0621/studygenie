# -*- coding: utf-8 -*-
"""Build cleaned guided-learning catalog for all 15 Grade 11 Science units."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYLLABUS = json.loads(
    (ROOT / "data" / "syllabus" / "grade11-science-units.json").read_text(
        encoding="utf-8"
    )
)
CORPUS = json.loads((ROOT / "grade11_science_corpus.json").read_text(encoding="utf-8"))
UNIT4 = json.loads(
    (ROOT / "data" / "guided-learning" / "unit-4.json").read_text(encoding="utf-8")
)
OUT = ROOT / "data" / "guided-learning" / "catalog.json"

HEADER = re.compile(
    r"(ශ්\u200dරේණිය|විද්\u200dයාව|පරිච්ඡේදය|කාර්යපත්\u200dර|NIE|Grade\s*11|Science)",
    re.I,
)
PAGE_NO = re.compile(r"^\s*\d{1,4}\s*$")
MULTI_SPACE = re.compile(r"\s+")


def u(*parts: str) -> str:
    return "".join(parts)


VOICE = {
    "activity": u(
        "\u0db4\u0ddc\u0dad\u0dca\u0dad\u0dda \u0dc3\u0dc4 \u0d9c\u0dd4\u0dbb\u0dd4 ",
        "\u0db8\u0dcf\u0dbb\u0dca\u0d9c\u0dba\u0dda \u0d91\u0d9a \u0dc3\u0dbb\u0dbd ",
        "\u0d9a\u0dca\u200d\u0dbb\u0dd2\u0dba\u0dcf\u0dc0\u0dbd\u0dd2\u0dba\u0d9a\u0dca \u0d9a\u0dbb\u0db1\u0dca\u0db1.",
    ),
    "a1": u(
        "\u0d85\u0db4\u0dd2 \u0db8\u0dd9\u0dc4\u0dd9\u0db8 \u0dc4\u0dd2\u0dad\u0db8\u0dd4. ",
        "{title} \u0dad\u0dca \u0d9c\u0dd9\u0daf\u0dbb\u0dda \u0d91\u0daf\u0dd2\u0db1\u0dd9\u0daf\u0dcf ",
        "\u0daf\u0dd9\u0dba\u0d9a\u0da7 \u0dc3\u0db8\u0dcf\u0db1\u0dba\u0dd2.",
    ),
    "a2": u(
        "\u0db1\u0dd2\u0dc0\u0dc3\u0dda \u0d91\u0d9a \u0d9a\u0dd4\u0da7\u0dca\u0da7\u0dd2\u0dba\u0d9a\u0dca ",
        "{title} \u0dc0\u0dbd\u0da7 \u0d9c\u0dbd\u0db4\u0dbd\u0dcf \u0db6\u0dbd\u0db1\u0dca\u0db1.",
    ),
    "a3": u(
        "\u0d91\u0d9a \u0db8\u0dd2\u0dad\u0dca\u200d\u0dbb\u0dba\u0d9a\u0dca \u0d91\u0d9a \u0d9a\u0ddc\u0da7\u0dc3\u0d9a\u0dca ",
        "\u0d9a\u0dbb\u0db1\u0dc0\u0dcf \u0dc0\u0d9c\u0dda {title} \u0dad\u0dda\u0dbb\u0dd9\u0db1\u0dc0\u0dcf.",
    ),
    "check": u(
        "{title} \u0d9a\u0dd2\u0dba\u0db1\u0dca\u0db1\u0dda \u0db8\u0ddc\u0d9a\u0d9a\u0dca\u0daf? ",
        "\u0d91\u0d9a \u0dc0\u0dcf\u0d9a\u0dca\u200d\u0dba\u0dba\u0d9a\u0dd2\u0db1\u0dca \u0d9a\u0dd2\u0dba\u0db1\u0dca\u0db1.",
    ),
    "point": u(
        "{title} Grade 11 Science \u0db4\u0ddc\u0dad\u0dca\u0dad\u0dda \u0d85\u0db1\u0dd4\u0dc0 \u0db8\u0dd6\u0dbd\u0dd2\u0d9a ",
        "\u0d85\u0daf\u0dc4\u0dc3\u0dba\u0dd2.",
    ),
}


def clean_text(raw: str) -> str:
    lines = []
    for line in raw.replace("\x00", " ").splitlines():
        piece = line.strip()
        if not piece or PAGE_NO.match(piece):
            continue
        if HEADER.search(piece) and len(piece) < 40:
            continue
        if len(re.findall(r"\sx\s", piece)) >= 3:
            continue
        piece = re.sub(r"\s+\d{1,3}(?=\s|$)", " ", piece)
        piece = MULTI_SPACE.sub(" ", piece).strip()
        if len(piece) > 12:
            lines.append(piece)
    return " ".join(lines)


def sentences(text: str, limit: int = 3) -> list[str]:
    bits = re.split(r"(?<=[\.\u0d8a!?])\s+", text)
    out = []
    for bit in bits:
        item = MULTI_SPACE.sub(" ", bit).strip(" .")
        if 18 <= len(item) <= 220:
            out.append(item + ".")
        if len(out) >= limit:
            break
    return out


def topic_no_title(raw: str, index: int, unit_no: int) -> tuple[str, str]:
    match = re.match(r"^(\d+\.\d+)\s+(.*)$", raw.strip())
    if match:
        return match.group(1), match.group(2).strip()
    return f"{unit_no}.{index + 1}", raw.strip()


def pages_for(book: str, start: int, end: int, kind: str) -> list[dict]:
    rows = []
    for page in CORPUS:
        if page.get("file_name") != book:
            continue
        if page.get("doc_type") != kind:
            continue
        num = int(page.get("page_number") or 0)
        if start <= num <= end:
            rows.append(page)
    return rows


def score(text: str, words: list[str]) -> int:
    hay = text.lower()
    return sum(2 if hay.count(word.lower()) else 0 for word in words if len(word) > 1)


def pick_clean(pages: list[dict], words: list[str], limit: int = 3) -> list[str]:
    ranked: list[tuple[int, str]] = []
    for page in pages:
        text = clean_text(page.get("content") or "")
        for sent in sentences(text, 8):
            ranked.append((score(sent, words), sent))
    ranked.sort(key=lambda row: (-row[0], -len(row[1])))
    seen: set[str] = set()
    out: list[str] = []
    for _, sent in ranked:
        key = sent[:40]
        if key in seen:
            continue
        seen.add(key)
        out.append(sent)
        if len(out) >= limit:
            break
    return out


def words_of(title: str) -> list[str]:
    return [w for w in re.split(r"[^\w\u0d80-\u0dff]+", title) if len(w) > 1][:6]


def knowledge_from_pages(title: str, book: str, start: int, end: int) -> dict:
    words = words_of(title)
    book_sents = pick_clean(pages_for(book, start, end, "textbook"), words)
    guide_sents = pick_clean(pages_for(book, start, end, "teachers_guide"), words, 2)
    if not book_sents:
        book_sents = [VOICE["point"].format(title=title)]
    ok = words[:4] or [title[:8]]
    return {
        "cleaned_content": " ".join(book_sents),
        "teacher_activities": " ".join(guide_sents) if guide_sents else VOICE["activity"],
        "key_terms": words[:6] or [title],
        "summary_points": book_sents[:3],
        "analogies": [
            VOICE["a1"].format(title=title),
            VOICE["a2"].format(title=title),
            VOICE["a3"].format(title=title),
        ],
        "checkpoint": VOICE["check"].format(title=title),
        "checkpoint_ok": ok,
    }


def topic_id(unit_no: int, topic_no: str) -> str:
    suffix = topic_no.replace(".", "-")
    return f"g11-sci-{suffix}"


def build_unit(row: dict) -> dict:
    unit_no = int(str(row["id"]).split("-")[-1])
    title = row["title"]
    book = row.get("book") or "textbook_p1.pdf"
    start = int(row.get("pageStart") or 1)
    end = int(row.get("pageEnd") or start)
    topics = []
    raw_topics = row.get("topics") or [title]
    span = max(1, (end - start + 1) // max(1, len(raw_topics)))
    for index, raw in enumerate(raw_topics):
        no, name = topic_no_title(raw, index, unit_no)
        t_start = start + index * span
        t_end = end if index == len(raw_topics) - 1 else t_start + span - 1
        topics.append(
            {
                "id": topic_id(unit_no, no),
                "topic_no": no,
                "topic_title": name,
                "order_index": index + 1,
                "page_start": t_start,
                "page_end": t_end,
                "knowledge": knowledge_from_pages(name, book, t_start, t_end),
            }
        )
    return {
        "grade": 11,
        "subject": "Science",
        "unit_no": unit_no,
        "unit_id": row["id"],
        "unit_title": title,
        "book": book,
        "topics": topics,
    }


def main() -> None:
    units = [build_unit(row) for row in SYLLABUS["units"]]
    for unit in units:
        if unit["unit_id"] == UNIT4["unit_id"]:
            unit["topics"] = UNIT4["topics"]
            unit["unit_title"] = UNIT4["unit_title"]
    OUT.write_text(
        json.dumps({"units": units}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    counts = [len(unit["topics"]) for unit in units]
    print("ok", OUT.name, "units", len(units), "topics", sum(counts))


if __name__ == "__main__":
    main()
