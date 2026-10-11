-- Run this once on an existing StudyGenie database (SQL Editor).
-- Safe to re-run. New installs already get this from schema.sql.

-- 1) Class + paper foreign keys
delete from public.class_students cs
where not exists (select 1 from public.class_rooms cr where cr.id = cs.class_id);

delete from public.class_assignments ca
where not exists (select 1 from public.class_rooms cr where cr.id = ca.class_id);

delete from public.study_paper_attempts a
where not exists (select 1 from public.study_papers p where p.id = a.paper_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'class_students_class_id_fkey'
  ) then
    alter table public.class_students
      add constraint class_students_class_id_fkey
      foreign key (class_id) references public.class_rooms (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'class_assignments_class_id_fkey'
  ) then
    alter table public.class_assignments
      add constraint class_assignments_class_id_fkey
      foreign key (class_id) references public.class_rooms (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'study_paper_attempts_paper_id_fkey'
  ) then
    alter table public.study_paper_attempts
      add constraint study_paper_attempts_paper_id_fkey
      foreign key (paper_id) references public.study_papers (id) on delete cascade;
  end if;
end $$;

create index if not exists class_students_class_idx
  on public.class_students (class_id);
create index if not exists class_assignments_class_idx
  on public.class_assignments (class_id);
create index if not exists study_paper_attempts_paper_idx
  on public.study_paper_attempts (paper_id);

-- 2) Guided learning completed topics (array → rows)
create table if not exists public.student_completed_topics (
  student_id text not null,
  unit_id text not null default '',
  topic_id text not null,
  completed_at timestamptz not null default now(),
  primary key (student_id, unit_id, topic_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_completed_topics_topic_id_fkey'
  ) then
    alter table public.student_completed_topics
      add constraint student_completed_topics_topic_id_fkey
      foreign key (topic_id) references public.curriculum_topics (id)
      on delete cascade;
  end if;
end $$;

alter table public.student_completed_topics enable row level security;

drop policy if exists own_completed_topics on public.student_completed_topics;
create policy own_completed_topics on public.student_completed_topics
  for all
  using (student_id = auth.uid()::text)
  with check (student_id = auth.uid()::text);

insert into public.student_completed_topics (student_id, unit_id, topic_id)
select s.student_id, s.unit_id, topic_id
from public.student_learning_state s
cross join lateral unnest(coalesce(s.completed_topic_ids, '{}')) as topic_id
where topic_id <> ''
  and exists (
    select 1 from public.curriculum_topics t where t.id = topic_id
  )
on conflict do nothing;

-- 3) MCQ polls: header + questions + votes (keep jsonb as cache)
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

create index if not exists mcq_poll_questions_poll_idx
  on public.mcq_poll_questions (poll_id, sort_order);
create index if not exists mcq_poll_votes_poll_idx
  on public.mcq_poll_votes (poll_id);
create index if not exists teacher_polls_user_idx
  on public.teacher_polls (user_id, created_at desc);
create index if not exists mcq_polls_owner_idx
  on public.mcq_polls (owner_id);

alter table public.mcq_poll_questions enable row level security;
alter table public.mcq_poll_votes enable row level security;
alter table public.mcq_poll_vote_answers enable row level security;
alter table public.teacher_polls enable row level security;

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

insert into public.mcq_poll_questions (
  id, poll_id, prompt, options, answer_index, sort_order
)
select
  coalesce(nullif(q->>'id', ''), p.id || '-q' || (ord - 1)::text),
  p.id,
  coalesce(q->>'prompt', ''),
  coalesce(
    array(select jsonb_array_elements_text(coalesce(q->'options', '[]'::jsonb))),
    '{}'::text[]
  ),
  coalesce((q->>'answerIndex')::int, (q->>'answer_index')::int, 0),
  (ord - 1)::int
from public.mcq_polls p
cross join lateral jsonb_array_elements(coalesce(p.questions, '[]'::jsonb))
  with ordinality as t(q, ord)
on conflict (id) do nothing;

insert into public.mcq_poll_votes (id, poll_id, voter_key, created_at)
select
  p.id || ':' || voter,
  p.id,
  voter,
  coalesce(
    (v->>'createdAt')::timestamptz,
    (v->>'created_at')::timestamptz,
    now()
  )
from public.mcq_polls p
cross join lateral jsonb_array_elements(coalesce(p.votes, '[]'::jsonb)) as v
cross join lateral (
  select coalesce(v->>'voterKey', v->>'voter_key') as voter
) keys
where voter is not null and voter <> ''
on conflict (id) do nothing;

insert into public.mcq_poll_vote_answers (vote_id, question_id, option_index)
select
  p.id || ':' || coalesce(v->>'voterKey', v->>'voter_key'),
  q.id,
  coalesce((ans.elem #>> '{}')::int, 0)
from public.mcq_polls p
cross join lateral jsonb_array_elements(coalesce(p.votes, '[]'::jsonb)) as v
cross join lateral jsonb_array_elements(coalesce(v->'answers', '[]'::jsonb))
  with ordinality as ans(elem, ord)
join public.mcq_poll_questions q
  on q.poll_id = p.id and q.sort_order = (ans.ord - 1)::int
where coalesce(v->>'voterKey', v->>'voter_key') is not null
on conflict do nothing;

insert into public.teacher_polls (
  id, user_id, poll_id, title, share_code, file_name, question_count, vote_count, created_at
)
select
  p.id,
  p.owner_id,
  p.id,
  p.title,
  p.share_code,
  p.file_name,
  coalesce(jsonb_array_length(p.questions), 0),
  coalesce(jsonb_array_length(p.votes), 0),
  p.created_at
from public.mcq_polls p
where p.owner_id is not null
on conflict (id) do nothing;
