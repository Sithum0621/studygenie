-- MCQ paper → private poll links (teacher home)

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
