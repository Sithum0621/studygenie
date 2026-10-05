-- Interactive Guided Learning (LMS + AI Tutor)
-- Run in Supabase SQL Editor after schema.sql, or append to a fresh project.

create table if not exists public.curriculum_topics (
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

create table if not exists public.topic_knowledge (
  topic_id text primary key references public.curriculum_topics (id) on delete cascade,
  cleaned_content text not null default '',
  teacher_activities text not null default '',
  key_terms text[] not null default '{}',
  summary_points text[] not null default '{}',
  analogies text[] not null default '{}',
  checkpoint text not null default '',
  checkpoint_ok text[] not null default '{}'
);

create table if not exists public.student_learning_state (
  student_id text not null,
  unit_id text not null default '',
  current_topic_id text references public.curriculum_topics (id) on delete set null,
  step text not null default 'intro'
    check (step in ('intro', 'explanation', 'checkpoint', 'completed')),
  clarification_count integer not null default 0,
  last_interaction timestamptz not null default now(),
  used_analogy_indexes integer[] not null default '{}',
  completed_topic_ids text[] not null default '{}',
  primary key (student_id, unit_id)
);

create index if not exists curriculum_topics_unit_idx
  on public.curriculum_topics (grade, subject, unit_no, order_index);

create index if not exists student_learning_state_topic_idx
  on public.student_learning_state (current_topic_id);

alter table public.curriculum_topics enable row level security;
alter table public.topic_knowledge enable row level security;
alter table public.student_learning_state enable row level security;

drop policy if exists curriculum_topics_read on public.curriculum_topics;
create policy curriculum_topics_read on public.curriculum_topics
  for select using (true);

drop policy if exists topic_knowledge_read on public.topic_knowledge;
create policy topic_knowledge_read on public.topic_knowledge
  for select using (true);

drop policy if exists own_learning_state on public.student_learning_state;
create policy own_learning_state on public.student_learning_state
  for all
  using (student_id = auth.uid()::text)
  with check (student_id = auth.uid()::text);
