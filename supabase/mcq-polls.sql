-- MCQ paper → private poll links (teacher home)
-- Canonical rows: mcq_polls + questions + votes. jsonb columns are a cache.

create table if not exists public.mcq_polls (
  id text primary key,
  share_code text not null unique,
  owner_id uuid references auth.users (id) on delete set null,
  title text not null default '',
  file_name text not null default '',
  questions jsonb not null default '[]'::jsonb,
  votes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mcq_polls
  add column if not exists owner_id uuid references auth.users (id) on delete set null;

create table if not exists public.mcq_poll_questions (
  id text primary key,
  poll_id text not null references public.mcq_polls (id) on delete cascade,
  prompt text not null default '',
  options text[] not null default '{}',
  answer_index integer not null default 0,
  sort_order integer not null default 0
);

create table if not exists public.mcq_poll_votes (
  id text primary key,
  poll_id text not null references public.mcq_polls (id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_key)
);

create table if not exists public.mcq_poll_vote_answers (
  vote_id text not null references public.mcq_poll_votes (id) on delete cascade,
  question_id text not null references public.mcq_poll_questions (id) on delete cascade,
  option_index integer not null default 0,
  primary key (vote_id, question_id)
);

create table if not exists public.teacher_polls (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  poll_id text not null references public.mcq_polls (id) on delete cascade,
  title text not null default '',
  share_code text not null,
  file_name text not null default '',
  question_count integer not null default 0,
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, poll_id)
);

alter table public.mcq_polls enable row level security;
alter table public.mcq_poll_questions enable row level security;
alter table public.mcq_poll_votes enable row level security;
alter table public.mcq_poll_vote_answers enable row level security;
alter table public.teacher_polls enable row level security;

drop policy if exists mcq_polls_read on public.mcq_polls;
create policy mcq_polls_read on public.mcq_polls
  for select using (true);

drop policy if exists mcq_polls_write on public.mcq_polls;
create policy mcq_polls_write on public.mcq_polls
  for insert with check (true);

drop policy if exists mcq_polls_update on public.mcq_polls;
create policy mcq_polls_update on public.mcq_polls
  for update using (true) with check (true);

drop policy if exists mcq_poll_questions_read on public.mcq_poll_questions;
create policy mcq_poll_questions_read on public.mcq_poll_questions
  for select using (true);
drop policy if exists mcq_poll_questions_write on public.mcq_poll_questions;
create policy mcq_poll_questions_write on public.mcq_poll_questions
  for all using (true) with check (true);

drop policy if exists mcq_poll_votes_read on public.mcq_poll_votes;
create policy mcq_poll_votes_read on public.mcq_poll_votes
  for select using (true);
drop policy if exists mcq_poll_votes_write on public.mcq_poll_votes;
create policy mcq_poll_votes_write on public.mcq_poll_votes
  for all using (true) with check (true);

drop policy if exists mcq_poll_vote_answers_read on public.mcq_poll_vote_answers;
create policy mcq_poll_vote_answers_read on public.mcq_poll_vote_answers
  for select using (true);
drop policy if exists mcq_poll_vote_answers_write on public.mcq_poll_vote_answers;
create policy mcq_poll_vote_answers_write on public.mcq_poll_vote_answers
  for all using (true) with check (true);

drop policy if exists own_teacher_polls on public.teacher_polls;
create policy own_teacher_polls on public.teacher_polls
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists mcq_polls_code_idx on public.mcq_polls (share_code);
create index if not exists mcq_polls_owner_idx on public.mcq_polls (owner_id);
create index if not exists mcq_poll_questions_poll_idx
  on public.mcq_poll_questions (poll_id, sort_order);
create index if not exists mcq_poll_votes_poll_idx
  on public.mcq_poll_votes (poll_id);
create index if not exists teacher_polls_user_idx
  on public.teacher_polls (user_id, created_at desc);
