# Supabase link karana widiya

StudyGenie app eka keys nathuwa **demo mode** eke run wenawa (local accounts + local notes). Real login / cloud save ona nam me steps follow karanna.

Keys **always** env file / hosting env vars eke witharak. Source code eke paste karanna epa. Git commit ekata `.env.local` yanne naha.

## 1. Project eka hadanna

1. [https://supabase.com](https://supabase.com) eken project ekak create karanna.
2. **Project Settings → API** eken me deka copy karanna:
   - Project URL
   - **Publishable** key (`sb_publishable_...` — old name: anon / public)

Secret / service role key **app eke or `.env.local` public vars walin danna epa**.

## 2. Env file eka

Local eke project root eke `.env.local` hadanna (`.env.example` copy karanna):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Production / live site eke **same names** hosting dashboard eke danna (Vercel → Settings → Environment Variables). Local witharak nemei — eka cloud project eka thama phone / live app ekenuth use wenawa.

Dev server eka restart karanna.

## 3. Auth

1. **Authentication → Providers → Email** enable karanna.
2. Local test ekata **Confirm email** off karanna puluwan (development only).
3. Google login later add karanna puluwan (optional).

## 4. Database

SQL Editor eke [`supabase/schema.sql`](../supabase/schema.sql) full eka run karanna. `IF NOT EXISTS` use karana nisa aye run karanna puluwan.

Eken enawa:

- `profiles` (`medium`, `language_mix` columns thiyenawa) — signup unama row auto hadenawa
- ClassGenie-style: `subjects`, `lessons`, `documents`, `chats`, `messages`, `quizzes`, `quiz_questions`, `quiz_attempts`, `flashcards`, `review_logs`, `progress_events`, `daily_questions`
- Student app (normalized, text IDs so localStorage IDs sync wenawa):
  - `study_notes`, `study_quizzes` + `study_quiz_questions`
  - `study_flashcard_decks` + `study_flashcards`
  - `study_documents`, `study_chats` + `study_messages`
  - `user_progress`, `year_events`
  - `daily_quiz_sets` + `daily_quiz_set_questions`, `daily_quiz_attempts`
  - `guide_progress`, `study_time` + `study_time_subjects`
  - `study_papers` + `study_paper_questions`, `study_paper_attempts`
  - `daily_task_plans`, `study_tasks`, `game_sessions`
- Row Level Security: logged-in user only own `user_id` rows
- Guided Learning: `curriculum_topics`, `topic_knowledge` (public read), `student_learning_state` (own `student_id`). Also in [`supabase/guided-learning.sql`](../supabase/guided-learning.sql). Seed Unit 4 with `python scripts/seed_guided_learning.py` (SQLite at `data/guided-learning/guided.db`).

Login una nam app eka **localStorage + Supabase dual-write**. Cloud eke data thiyenawanam eka hydrate wenawa; nathnam local data ekaparak push wenawa. Demo mode (keys nathuwa) localStorage witharak.

## 5. Storage (PDF / notes)

1. **Storage → New bucket**
2. Name: `documents`
3. Public: **off**
4. Policy: user can read/write only `documents/{user_id}/...`

Upload UI eka iussara local metadata save karanawa. Bucket eka ready unama file upload cloud ekata connect karanna puluwan.

## 6. Check

- App eke login/signup page eke banner eka: `Supabase link una`
- Aluth account ekak hadala **Authentication → Users** eke penenawada balanna
- `profiles` table eke row ekak thiyenawada balanna
