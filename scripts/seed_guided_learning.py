"""Create SQLite guided.db from Unit 4 JSON. Optional Postgres via DATABASE_URL."""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "data" / "guided-learning" / "catalog.json"
DB = ROOT / "data" / "guided-learning" / "guided.db"

SQLITE_SCHEMA = """
create table if not exists curriculum_topics (
  id text primary key,
  grade integer not null,
  subject text not null,
  unit_no integer not null,
  unit_title text not null,
  topic_no text not null,
  topic_title text not null,
  order_index integer not null default 0,
  unit_id text,
  page_start integer,
  page_end integer
);

create table if not exists topic_knowledge (
  topic_id text primary key references curriculum_topics(id) on delete cascade,
  cleaned_content text not null default '',
  teacher_activities text not null default '',
  key_terms text not null default '[]',
  summary_points text not null default '[]',
  analogies text not null default '[]',
  checkpoint text not null default '',
  checkpoint_ok text not null default '[]'
);

create table if not exists student_learning_state (
  student_id text not null,
  unit_id text not null default '',
  current_topic_id text references curriculum_topics(id) on delete set null,
  step text not null default 'intro'
    check (step in ('intro', 'explanation', 'checkpoint', 'completed')),
  clarification_count integer not null default 0,
  last_interaction text not null default current_timestamp,
  used_analogy_indexes text not null default '[]',
  completed_topic_ids text not null default '[]',
  primary key (student_id, unit_id)
);
"""


def load_seed() -> list[dict]:
    raw = json.loads(SEED.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "units" in raw:
        return raw["units"]
    return [raw]


def seed_sqlite(units: list[dict]) -> None:
    DB.parent.mkdir(parents=True, exist_ok=True)
    if DB.exists():
        DB.unlink()
    conn = sqlite3.connect(DB)
    try:
        conn.executescript(SQLITE_SCHEMA)
        for data in units:
            for topic in data["topics"]:
                conn.execute(
                    """
                    insert into curriculum_topics (
                      id, grade, subject, unit_no, unit_title, topic_no, topic_title,
                      order_index, unit_id, page_start, page_end
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        topic["id"],
                        data["grade"],
                        data["subject"],
                        data["unit_no"],
                        data["unit_title"],
                        topic["topic_no"],
                        topic["topic_title"],
                        topic["order_index"],
                        data["unit_id"],
                        topic.get("page_start"),
                        topic.get("page_end"),
                    ),
                )
                knowledge = topic["knowledge"]
                conn.execute(
                    """
                    insert into topic_knowledge (
                      topic_id, cleaned_content, teacher_activities, key_terms,
                      summary_points, analogies, checkpoint, checkpoint_ok
                    ) values (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        topic["id"],
                        knowledge["cleaned_content"],
                        knowledge["teacher_activities"],
                        json.dumps(knowledge["key_terms"], ensure_ascii=False),
                        json.dumps(knowledge["summary_points"], ensure_ascii=False),
                        json.dumps(knowledge["analogies"], ensure_ascii=False),
                        knowledge["checkpoint"],
                        json.dumps(knowledge["checkpoint_ok"], ensure_ascii=False),
                    ),
                )
        conn.commit()
    finally:
        conn.close()


def seed_postgres(units: list[dict]) -> None:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        return
    try:
        import psycopg
    except ImportError:
        print("skip postgres: psycopg not installed")
        return

    sql = (ROOT / "supabase" / "guided-learning.sql").read_text(encoding="utf-8")
    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            for data in units:
                for topic in data["topics"]:
                    cur.execute(
                        """
                        insert into curriculum_topics (
                          id, grade, subject, unit_no, unit_title, topic_no, topic_title,
                          order_index, unit_id, page_start, page_end
                        ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        on conflict (id) do update set
                          topic_title = excluded.topic_title,
                          order_index = excluded.order_index
                        """,
                        (
                            topic["id"],
                            data["grade"],
                            data["subject"],
                            data["unit_no"],
                            data["unit_title"],
                            topic["topic_no"],
                            topic["topic_title"],
                            topic["order_index"],
                            data["unit_id"],
                            topic.get("page_start"),
                            topic.get("page_end"),
                        ),
                    )
                    knowledge = topic["knowledge"]
                    cur.execute(
                        """
                        insert into topic_knowledge (
                          topic_id, cleaned_content, teacher_activities, key_terms,
                          summary_points, analogies, checkpoint, checkpoint_ok
                        ) values (%s, %s, %s, %s, %s, %s, %s, %s)
                        on conflict (topic_id) do update set
                          cleaned_content = excluded.cleaned_content,
                          teacher_activities = excluded.teacher_activities,
                          key_terms = excluded.key_terms,
                          summary_points = excluded.summary_points,
                          analogies = excluded.analogies,
                          checkpoint = excluded.checkpoint,
                          checkpoint_ok = excluded.checkpoint_ok
                        """,
                        (
                            topic["id"],
                            knowledge["cleaned_content"],
                            knowledge["teacher_activities"],
                            knowledge["key_terms"],
                            knowledge["summary_points"],
                            knowledge["analogies"],
                            knowledge["checkpoint"],
                            knowledge["checkpoint_ok"],
                        ),
                    )
        conn.commit()
    print("postgres seeded")


def main() -> None:
    units = load_seed()
    seed_sqlite(units)
    print("sqlite", DB, "units", len(units), "topics", sum(len(u["topics"]) for u in units))
    seed_postgres(units)


if __name__ == "__main__":
    main()
