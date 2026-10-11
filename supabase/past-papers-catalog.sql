-- Run this in Supabase SQL Editor so every student can load all past / model
-- paper MCQs exactly as stored.

drop policy if exists study_papers_read_catalog on public.study_papers;
create policy study_papers_read_catalog on public.study_papers
  for select using (kind in ('past', 'model'));

drop policy if exists study_paper_questions_read_catalog on public.study_paper_questions;
create policy study_paper_questions_read_catalog on public.study_paper_questions
  for select using (
    exists (
      select 1 from public.study_papers p
      where p.id = paper_id
        and p.kind in ('past', 'model')
    )
  );
