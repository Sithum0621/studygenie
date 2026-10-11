import {
  hasSinhalaScript,
  hasTamilScript,
  isSinhalaEnglishMix,
  languageSubjectKind,
  parseStudyMedium,
} from "./content-language";
import type { AppLanguage } from "./copy";
import {
  normalizeQuizQuestions,
  quizMatchesAppLanguage,
  scienceDailyFallback,
  shuffleQuestionOptions,
} from "./daily-questions";
import { localStore } from "./local-store";
import {
  dropSeenQuestions,
  recentAvoidPrompts,
  rememberQuestions,
  uniqueQuestions,
} from "./question-memory";
import { pickScienceMcqs } from "./science-mcq-bank";
import { buildStudentSnapshot } from "./student-context";
import { collectStudyFocuses } from "./study-chats";
import type { Profile, QuizQuestion, StudyMedium } from "./types";

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
  seed = `${Date.now()}`,
): QuizQuestion[] {
  const avoid = recentAvoidPrompts();
  const topics = collectStudyFocuses().map((row) => row.topic);
  const bank = pickScienceMcqs({
    language,
    medium,
    size: Math.max(size, 12),
    seed,
    avoid,
    topics,
  });
  const pool = uniqueQuestions(
    dropSeenQuestions(
      [
        ...bank,
        ...fallbackBank(language, medium),
      ].filter((question) => {
        if (!question.prompt.trim()) return false;
        const kind = languageSubjectKind(question.subject || "");
        if (kind === "english") return true;
        if (kind === "tamil") return hasTamilScript(question.prompt);
        if (kind === "sinhala") return hasSinhalaScript(question.prompt);
        return isSinhalaEnglishMix(questionMixText(question));
      }),
      avoid,
    ),
  );
  const safe = uniqueQuestions(
    shuffle(pool.length ? pool : bank.length ? bank : fallbackBank(language, medium)),
  );
  const picked = safe.slice(0, size);
  return picked.map((row, index) =>
    shuffleQuestionOptions({ ...row, id: `${row.id}_${seed}_${index}` }),
  );
}

export async function fetchGameQuestions(
  size = 8,
  language: AppLanguage = "singlish",
  user: Profile | null = null,
): Promise<QuizQuestion[]> {
  const medium = parseStudyMedium(user?.medium);
  const roundId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const local = pickGameQuestions(size, language, medium, user?.subjects ?? [], roundId);
  try {
    const res = await fetch("/api/daily-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        language,
        purpose: "game",
        roundId,
        avoidPrompts: recentAvoidPrompts(),
        student: buildStudentSnapshot(user, user?.subjects?.join(" ")),
      }),
    });
    const data = (await res.json()) as { questions?: unknown };
    const questions = uniqueQuestions(
      dropSeenQuestions(
        normalizeQuizQuestions(data.questions, size),
        recentAvoidPrompts(),
      ),
    );
    const usable =
      questions.length >= 6 && quizMatchesAppLanguage(questions, language)
        ? questions.slice(0, size)
        : uniqueQuestions([...questions, ...local]).slice(0, size);
    if (usable.length) {
      rememberQuestions(usable);
      return usable.map((row, index) =>
        shuffleQuestionOptions({ ...row, id: `${row.id}_g_${index}` }),
      );
    }
  } catch {
    /* local round */
  }
  rememberQuestions(local);
  return local;
}
