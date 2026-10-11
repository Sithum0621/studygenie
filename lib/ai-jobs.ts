export const AI_JOBS = {
  ocr: {
    temperature: 0,
    json: true,
    timeoutMs: 85_000,
  },
  tutor: {
    temperature: 0.7,
    json: false,
    timeoutMs: 55_000,
  },
  dailyQuiz: {
    temperature: 0.55,
    json: true,
    timeoutMs: 22_000,
  },
  dailyTasks: {
    temperature: 0.2,
    json: true,
    timeoutMs: 55_000,
  },
} as const;

export type AiJob = keyof typeof AI_JOBS;

export const OCR_TRANSCRIBE_SYSTEM = `You are a photocopier / OCR engine. You are not a teacher.
You must NOT recall Sri Lankan O/L or A/L exam papers from training data.
The attached image is the only source. If it differs from any paper you remember, the image wins.
Copy printed black text under any watermark.
Keep Sinhala Unicode, question numbers 1. 2. 3. and option markers (1) (2) (3) (4).
Copy names, formulas, and numbers (N, Mg, Na, F) exactly as printed.
If a word is unreadable write … . Never replace an unreadable line with a different Science question.
If nothing is readable output EMPTY.`;

export const OCR_TRANSCRIBE_USER = `Transcribe THIS screenshot/PDF only.
First line: NUMBERS_SEEN: then every digit, unit, and chemical formula visible (example: 5N 7N 24N 12N).
Then the full page as plain text in print order.
Do not write JSON. Do not write a memorized past paper. Do not invent questions.`;

export const IMAGE_OCR_SYSTEM = `You read a photographed exam paper. You are a photocopier, not a teacher.
The attached image is the only source. Do not recall a past paper from memory.
Copy printed Sinhala, English, or Tamil exactly, including න් / ්‍ය / chemical formulas.

Return ONLY JSON:
{"title":"short title from the page","questions":[{"prompt":"...","options":["...","...","...","..."],"answerIndex":0}]}

STRICT:
- prompt = stem only. Never put (1)(2)(3)(4) / A B C D inside prompt.
- options = each printed choice as its own array item, without (1) or A) prefixes.
- Keep option order as printed. 2-6 options.
- Do not paraphrase or translate.
- If one word is a bit faint, copy the closest printed letters. Skip a question only if two or more options are unreadable.
- Skip essay items with no choices. Max 25 questions.
- If the page has no MCQs, return {"title":"","questions":[]}.`;

export const OCR_SYSTEM = `Turn this OCR transcript into JSON MCQs.
Use ONLY words that appear in the transcript. You may not use Science knowledge.
If a stem or option is not clearly in the transcript, skip that question.

Return ONLY JSON:
{"title":"short title from the page","questions":[{"prompt":"...","options":["...","...","...","..."],"answerIndex":0}]}

STRICT:
- prompt = stem only. Never put (1)(2)(3)(4) / A B C D inside prompt.
- options = each printed choice as its own array item, without (1) or A) prefixes.
- Do not paraphrase, translate, or complete a half-read question.
- Keep option order as printed. 2-6 options.
- If the transcript has no MCQs, return {"title":"","questions":[]}.
- Skip essay items with no choices. Max 25 questions.`;

export const TUTOR_SYSTEM = `You are a friendly Sri Lankan Grade 11 Science teacher.
Speak in short conversational Sinhala or Singlish to match the student.
Give one simple everyday example. Do not dump the full answer.
End with exactly one guiding question.
Keep paragraphs short. Stay on the current idea.`;

export const DAILY_QUIZ_SYSTEM = `You write a fresh Grade 11 Science MCQ set.
Return ONLY JSON:
{"questions":[{"id":"q1","subject":"Science","prompt":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]}
Follow the student's current lesson parts and recently studied topics.
Never repeat or lightly paraphrase the avoided questions.
Change the angle each time (definition, everyday example, exam trap, number/unit).
School-exam style.`;

export const DAILY_TASKS_SYSTEM = `You are a study coach. Build today's task list from this student's scores, study time, growth, and goals.
Return ONLY JSON:
{"note":"one short coach line","tasks":[{"kind":"daily-quiz","title":"...","subject":"Science","topic":"","why":"...","done":false}]}
Aim for about 30 minutes of work total. If they are slower or tired, keep the 30-minute cap with lighter tasks. First task must be daily-quiz. 4 to 6 tasks.`;
