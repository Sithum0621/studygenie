# StudyGenie

AI-powered education platform. **Next.js** web app + **PWA** (phone Home Screen ekata install karanna puluwan).

Placeholder UI — final look later change karanna puluwan. App text eka Singlish.

## Run karana widiya

```bash
npm install
cp .env.example .env.local
npm run dev
```

Browser eke [http://localhost:3000](http://localhost:3000) open karanna.

Supabase keys nathuwa **demo mode** eken signup/login, notes, quiz, flashcards work wenawa (browser localStorage).

## PWA test

1. `npm run build` then `npm start`
2. Phone or Chrome eken site eka open karanna
3. Menu → **Add to Home Screen** / Install
4. Offline page: `/offline`

Dev mode eke service worker register karanne naha (hot reload narak karanna epa nisa).

## Main routes

- `/` Welcome
- `/login` `/signup`
- `/home` dashboard
- `/tutor` AI Tutor
- `/notes` `/quiz` `/flashcards` `/uploads`
- `/profile`

## Docs

- [docs/SUPABASE.md](docs/SUPABASE.md) — project link, Auth, SQL, Storage
- [docs/COPY-GUIDE.md](docs/COPY-GUIDE.md) — Singlish writing rules
- [supabase/schema.sql](supabase/schema.sql) — tables + RLS

## Env

`.env.example` template eka. Real keys `.env.local` eke (git ignore). Production eke same names hosting dashboard eke.

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client
- `AI_API_KEY` — server only (`/api/tutor`, `/api/generate`)

Keys code eke hardcode karanna epa. Keys naththam demo answers / local save use wenawa.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
