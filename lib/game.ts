import {
  contentScriptForSubject,
  hasSinhalaScript,
  hasTamilScript,
  isSinhalaEnglishMix,
  languageSubjectKind,
  parseStudyMedium,
} from "./content-language";
import type { AppLanguage } from "./copy";
import {
  scienceDailyFallback,
  shuffleQuestionOptions,
} from "./daily-questions";
import { localStore } from "./local-store";
import { seedPapers } from "./papers";
import type { QuizQuestion, StudyMedium } from "./types";

function tamilScienceFallback(): QuizQuestion[] {
  return [
    {
      id: "g11-sci-ta-1",
      subject: "Science",
      prompt: "தாவரத்தில் சைலம் திசுவின் முக்கிய வேலை என்ன?",
      options: [
        "நீர் மற்றும் கனிமங்களை மேலே கொண்டு செல்லும்",
        "உணவை மட்டும் கீழே கொண்டு செல்லும்",
        "விதைகளை உருவாக்கும்",
        "ஒலியை உருவாக்கும்",
      ],
      answerIndex: 0,
      explanation:
        "சைலம் வேர்களிலிருந்து இலைகளுக்கு நீர் மற்றும் கனிமங்களை கொண்டு செல்லும்.",
    },
    {
      id: "g11-sci-ta-2",
      subject: "Science",
      prompt: "ஒளிச்சேர்க்கைக்கு தேவையான இணை எது?",
      options: [
        "பச்சையம் மற்றும் சூரிய ஒளி",
        "உப்பு மற்றும் காற்று",
        "இரும்பு மற்றும் ஒலி",
        "பனி மற்றும் பனிக்கட்டி",
      ],
      answerIndex: 0,
      explanation: "பச்சையம் ஒளியை உறிஞ்சி தாவரம் உணவு தயாரிக்க உதவும்.",
    },
    {
      id: "g11-sci-ta-3",
      subject: "Science",
      prompt: "மனித இரத்த ஓட்டத்தின் பம்ப் எது?",
      options: ["இதயம்", "கல்லீரல்", "சிறுநீரகம்", "நுரையீரல்"],
      answerIndex: 0,
      explanation: "இதயம் உடல் முழுவதும் இரத்தத்தை செலுத்தும்.",
    },
    {
      id: "g11-sci-ta-4",
      subject: "Science",
      prompt: "அமிலத்தின் pH மதிப்பு எப்படி இருக்கும்?",
      options: ["7க்கு குறைவு", "சரியாக 7", "14க்கு மேல்", "0 மட்டும்"],
      answerIndex: 0,
      explanation: "அமிலங்களின் pH 7க்கு குறைவு. 7 நடுநிலை.",
    },
    {
      id: "g11-sci-ta-5",
      subject: "Science",
      prompt: "வெப்பம் என்றால் என்ன?",
      options: [
        "வெப்பநிலை வேறுபாட்டால் நகரும் ஆற்றல்",
        "ஒரு நிறம்",
        "ஒரு எடை",
        "ஒரு ஒலி",
      ],
      answerIndex: 0,
      explanation: "வெப்பம் சூடான இடத்திலிருந்து குளிர்ந்த இடத்துக்கு நகரும் ஆற்றல்.",
    },
    {
      id: "g11-sci-ta-6",
      subject: "Science",
      prompt: "புளோயம் திசு எதை கொண்டு செல்லும்?",
      options: ["தயாரித்த உணவு", "காற்று மட்டும்", "எலும்பு", "இரத்தம்"],
      answerIndex: 0,
      explanation: "புளோயம் இலைகளில் தயாரித்த உணவை மற்ற பகுதிகளுக்கு கொண்டு செல்லும்.",
    },
  ];
}

function fallbackBank(language: AppLanguage, medium: StudyMedium) {
  if (medium === "tamil") return tamilScienceFallback();
  return scienceDailyFallback(language === "english" ? "english" : "singlish");
}

function questionMixText(question: QuizQuestion) {
  return [question.prompt, ...question.options].join(" ");
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function pickGameQuestions(
  size = 8,
  language: AppLanguage = "singlish",
  medium: StudyMedium = "sinhala",
  _subjects: string[] = [],
): QuizQuestion[] {
  const script = contentScriptForSubject("Science", medium, language);
  let pool: QuizQuestion[] = [];

  if (script === "english") {
    pool = seedPapers().flatMap((paper) =>
      paper.questions.map((question) => ({
        ...question,
        subject: question.subject || paper.subject,
      })),
    );
  } else {
    const quizLanguage = language === "english" ? "english" : "singlish";
    const fallback = fallbackBank(language, medium);
    pool = [...fallback, ...fallback.map((row) => ({ ...row, id: `${row.id}_b` }))];
    const cached = localStore.getDailyQuizSet();
    if (
      cached?.questions.length &&
      cached.language === quizLanguage &&
      (!cached.medium || cached.medium === parseStudyMedium(medium))
    ) {
      pool = [...cached.questions, ...pool];
    }
    pool = pool.filter((question) => {
      const kind = languageSubjectKind(question.subject || "");
      if (kind === "english") return true;
      if (kind === "tamil") return hasTamilScript(question.prompt);
      if (kind === "sinhala") return hasSinhalaScript(question.prompt);
      return isSinhalaEnglishMix(questionMixText(question));
    });
    if (!pool.length) pool = fallback;
  }

  const unique = new Map<string, QuizQuestion>();
  for (const question of pool) {
    if (!question.prompt.trim()) continue;
    unique.set(`${question.subject}:${question.prompt}`, question);
  }

  const rows = shuffle([...unique.values()]);
  const safe = rows.length ? rows : fallbackBank(language, medium);
  if (!safe.length) return [];
  return Array.from({ length: size }, (_, index) => {
    const row = safe[index % safe.length];
    return shuffleQuestionOptions({ ...row, id: `${row.id}_${index}` });
  });
}
