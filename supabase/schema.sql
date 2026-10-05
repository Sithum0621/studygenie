-- StudyGenie schema + RLS
-- Supabase SQL Editor eke me file eka run karanna.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  grade text default '',
  subjects text[] default '{}',
  language_mix text not null default 'singlish',
  medium text not null default 'sinhala',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  topic text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  file_name text not null,
  storage_path text,
  size_bytes integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text default 'AI Tutor',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  score integer,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  prompt text not null,
  options text[] not null,
  answer_index integer not null,
  explanation text default ''
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  front text not null,
  back text not null,
  known boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.review_logs (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  known boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  value integer,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.subjects (name)
values ('Maths'), ('Science'), ('English'), ('Sinhala'), ('Tamil'), ('History'), ('ICT')
on conflict (name) do nothing;

create table if not exists public.daily_questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  prompt text not null,
  options text[] not null,
  answer_index integer not null,
  explanation text default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.lessons enable row level security;
alter table public.documents enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.flashcards enable row level security;
alter table public.review_logs enable row level security;
alter table public.progress_events enable row level security;
alter table public.daily_questions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "subjects read" on public.subjects;
create policy "subjects read" on public.subjects
  for select using (true);

drop policy if exists "own lessons" on public.lessons;
create policy "own lessons" on public.lessons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own documents" on public.documents;
create policy "own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own chats" on public.chats;
create policy "own chats" on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own quizzes" on public.quizzes;
create policy "own quizzes" on public.quizzes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own quiz questions" on public.quiz_questions;
create policy "own quiz questions" on public.quiz_questions
  for all using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.user_id = auth.uid())
  );

drop policy if exists "own quiz attempts" on public.quiz_attempts;
create policy "own quiz attempts" on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own flashcards" on public.flashcards;
create policy "own flashcards" on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own review logs" on public.review_logs;
create policy "own review logs" on public.review_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own progress" on public.progress_events;
create policy "own progress" on public.progress_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily questions read" on public.daily_questions;
create policy "daily questions read" on public.daily_questions
  for select using (true);

drop policy if exists "daily questions write" on public.daily_questions;
create policy "daily questions write" on public.daily_questions
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage: dashboard eken `documents` bucket eka create karanna (private).
-- Policy example (Storage policies tab):
-- path first folder = auth.uid()::text

alter table public.profiles
  add column if not exists medium text not null default 'sinhala';

alter table public.profiles
  add column if not exists language_mix text not null default 'singlish';

-- Student app data (normalized, text ids so local IDs sync as-is)

create table if not exists public.study_notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  topic text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.study_quizzes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null default '',
  kind text not null default 'practice',
  score integer,
  answers jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.study_quiz_questions (
  id text primary key,
  quiz_id text not null references public.study_quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  options text[] not null default '{}',
  answer_index integer not null default 0,
  explanation text not null default '',
  subject text,
  sort_order integer not null default 0
);

create table if not exists public.study_flashcard_decks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.study_flashcards (
  id text primary key,
  deck_id text not null references public.study_flashcard_decks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  front text not null default '',
  back text not null default '',
  known boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.study_documents (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  file_name text not null default '',
  size_bytes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.study_chats (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'study',
  title text not null default 'Chat',
  focus_subject text,
  focus_topic text,
  focus_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_messages (
  id text primary key,
  chat_id text not null references public.study_chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  sort_order integer not null default 0
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  streak integer not null default 0,
  last_active_date date,
  last_quiz_score integer,
  last_quiz_topic text,
  daily_quiz_date date,
  daily_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.year_events (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_date date not null,
  title text not null default ''
);

create table if not exists public.daily_quiz_sets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_date date not null,
  language text not null default 'singlish',
  medium text,
  generated_at timestamptz not null default now(),
  demo boolean not null default false,
  style_version integer not null default 0,
  unique (user_id, quiz_date)
);

create table if not exists public.daily_quiz_set_questions (
  id text primary key,
  set_id text not null references public.daily_quiz_sets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  options text[] not null default '{}',
  answer_index integer not null default 0,
  explanation text not null default '',
  subject text,
  sort_order integer not null default 0
);

create table if not exists public.daily_quiz_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_date date not null,
  set_id text references public.daily_quiz_sets (id) on delete set null,
  answers jsonb not null default '[]'::jsonb,
  question_index integer not null default 0,
  revealed boolean not null default false,
  completed boolean not null default false,
  score integer,
  primary key (user_id, quiz_date)
);

create table if not exists public.guide_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  unit_id text not null,
  subject text not null default '',
  title text not null default '',
  estimated_minutes integer not null default 0,
  done_at timestamptz,
  primary key (user_id, unit_id)
);

create table if not exists public.study_time (
  user_id uuid primary key references auth.users (id) on delete cascade,
  study_minutes integer not null default 0,
  waste_minutes integer not null default 0,
  last_tick_at timestamptz,
  last_study_subject text
);

create table if not exists public.study_time_subjects (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  minutes integer not null default 0,
  primary key (user_id, subject)
);

create table if not exists public.study_papers (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('past', 'model', 'own')),
  title text not null default '',
  subject text not null default '',
  year text,
  created_at timestamptz not null default now()
);

create table if not exists public.study_paper_questions (
  id text primary key,
  paper_id text not null references public.study_papers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  options text[] not null default '{}',
  answer_index integer not null default 0,
  explanation text not null default '',
  subject text,
  sort_order integer not null default 0
);

create table if not exists public.study_paper_attempts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id text not null,
  score integer not null default 0,
  time_minutes integer not null default 0,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_task_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  language text not null default 'singlish',
  note text,
  generated_at timestamptz not null default now(),
  demo boolean not null default false,
  primary key (user_id, plan_date)
);

create table if not exists public.study_tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  title text not null default '',
  subject text not null default '',
  topic text,
  kind text,
  href text,
  why text,
  done boolean not null default false,
  source text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null default 0,
  question_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.class_rooms (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  grade text not null default '',
  subject text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.class_students (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  class_id text not null,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.class_assignments (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  class_id text not null,
  title text not null default '',
  details text not null default '',
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists study_notes_user_idx on public.study_notes (user_id, created_at desc);
create index if not exists study_quizzes_user_idx on public.study_quizzes (user_id, created_at desc);
create index if not exists study_quiz_questions_quiz_idx on public.study_quiz_questions (quiz_id, sort_order);
create index if not exists study_chats_user_idx on public.study_chats (user_id, updated_at desc);
create index if not exists study_messages_chat_idx on public.study_messages (chat_id, sort_order);
create index if not exists year_events_user_idx on public.year_events (user_id, event_date);
create index if not exists study_papers_user_idx on public.study_papers (user_id, created_at desc);
create table if not exists public.curriculum (
  id text primary key,
  country text not null default 'LK',
  body jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.syllabus_chunks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null,
  title text not null,
  kind text not null,
  subject text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.curriculum enable row level security;
drop policy if exists curriculum_read on public.curriculum;
create policy curriculum_read on public.curriculum
  for select using (true);

create index if not exists game_sessions_user_idx on public.game_sessions (user_id, created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array[
    'study_notes',
    'study_quizzes',
    'study_quiz_questions',
    'study_flashcard_decks',
    'study_flashcards',
    'study_documents',
    'study_chats',
    'study_messages',
    'user_progress',
    'year_events',
    'daily_quiz_sets',
    'daily_quiz_set_questions',
    'daily_quiz_attempts',
    'guide_progress',
    'study_time',
    'study_time_subjects',
    'study_papers',
    'study_paper_questions',
    'study_paper_attempts',
    'daily_task_plans',
    'study_tasks',
    'game_sessions',
    'class_rooms',
    'class_students',
    'class_assignments',
    'syllabus_chunks'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end;
$$;

-- Interactive Guided Learning (LMS + AI Tutor). Also in supabase/guided-learning.sql
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

-- MCQ paper → private poll links (also supabase/mcq-polls.sql)
create table if not exists public.mcq_polls (
  id text primary key,
  share_code text not null unique,
  title text not null default '',
  file_name text not null default '',
  questions jsonb not null default '[]'::jsonb,
  votes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mcq_polls enable row level security;

drop policy if exists mcq_polls_read on public.mcq_polls;
create policy mcq_polls_read on public.mcq_polls
  for select using (true);

drop policy if exists mcq_polls_write on public.mcq_polls;
create policy mcq_polls_write on public.mcq_polls
  for insert with check (true);

drop policy if exists mcq_polls_update on public.mcq_polls;
create policy mcq_polls_update on public.mcq_polls
  for update using (true) with check (true);

create index if not exists mcq_polls_code_idx on public.mcq_polls (share_code);
