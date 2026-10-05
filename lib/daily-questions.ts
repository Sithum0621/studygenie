import type { AppLanguage } from "./copy";
import type { DailyQuestion, QuizQuestion } from "./types";

const u = (...codes: number[]) => String.fromCharCode(...codes);

export function shuffleQuestionOptions(question: QuizQuestion): QuizQuestion {
  const pairs = question.options.map((text, index) => ({
    text,
    correct: index === question.answerIndex,
  }));
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return {
    ...question,
    options: pairs.map((row) => row.text),
    answerIndex: Math.max(
      0,
      pairs.findIndex((row) => row.correct),
    ),
  };
}

export const DAILY_SUBJECTS = [
  "Maths",
  "Science",
  "English",
  "Sinhala",
  "Tamil",
  "History",
  "ICT",
] as const;

export function pickMixedQuestions(
  items: DailyQuestion[],
  size = 6,
): DailyQuestion[] {
  if (items.length === 0) return [];

  const bySubject = new Map<string, DailyQuestion[]>();
  for (const item of items) {
    const list = bySubject.get(item.subject) ?? [];
    list.push(item);
    bySubject.set(item.subject, list);
  }

  for (const list of bySubject.values()) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  const subjects = [...bySubject.keys()];
  const picked: DailyQuestion[] = [];
  let round = 0;
  while (picked.length < Math.min(size, items.length)) {
    let added = false;
    for (const subject of subjects) {
      const next = bySubject.get(subject)?.[round];
      if (next) {
        picked.push(next);
        added = true;
        if (picked.length >= size) break;
      }
    }
    if (!added) break;
    round += 1;
  }
  return picked;
}

export function toQuizQuestions(items: DailyQuestion[]): QuizQuestion[] {
  return items.map((item) => ({
    id: item.id,
    prompt: item.prompt,
    options: item.options,
    answerIndex: item.answerIndex,
    explanation: item.explanation,
    subject: item.subject,
  }));
}

export function subjectSummary(items: DailyQuestion[]) {
  const names = [...new Set(items.map((item) => item.subject))];
  return names.length ? names.join(" · ") : "";
}

export function scoreBySubject(
  questions: QuizQuestion[],
  answers: (number | null)[],
) {
  const rows = new Map<string, { correct: number; total: number }>();
  questions.forEach((question, index) => {
    const subject = question.subject || "Other";
    const row = rows.get(subject) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (answers[index] === question.answerIndex) row.correct += 1;
    rows.set(subject, row);
  });
  return DAILY_SUBJECTS.filter((subject) => rows.has(subject)).map(
    (subject) => ({
      subject,
      ...(rows.get(subject) as { correct: number; total: number }),
    }),
  );
}

export function quizSubjectSummary(questions: QuizQuestion[]) {
  const names = [
    ...new Set(
      questions
        .map((question) => question.subject)
        .filter((subject): subject is string => Boolean(subject)),
    ),
  ];
  return names.length ? names.join(" · ") : "";
}

export function normalizeQuizQuestions(raw: unknown, size = 8): QuizQuestion[] {
  const record = raw as { questions?: unknown } | null;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(record?.questions)
      ? record.questions
      : [];

  return list
    .slice(0, size)
    .map((item, index) => {
      const row = (item || {}) as Record<string, unknown>;
      const options = Array.isArray(row.options)
        ? row.options.map((option) => String(option)).slice(0, 4)
        : [];
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }
      let answerIndex = Number(row.answerIndex);
      if (
        !Number.isInteger(answerIndex) ||
        answerIndex < 0 ||
        answerIndex > 3
      ) {
        answerIndex = 0;
      }
      const subjectRaw = String(row.subject || DAILY_SUBJECTS[index % DAILY_SUBJECTS.length]);
      const subject = (DAILY_SUBJECTS as readonly string[]).includes(subjectRaw)
        ? subjectRaw
        : subjectRaw || DAILY_SUBJECTS[index % DAILY_SUBJECTS.length];
      return shuffleQuestionOptions({
        id: String(row.id || `q_${index + 1}`),
        prompt: String(row.prompt || "").trim(),
        options,
        answerIndex,
        explanation: String(row.explanation || ""),
        subject,
      });
    })
    .filter((question) => question.prompt);
}

export function normalizeDailyQuizQuestions(raw: unknown): QuizQuestion[] {
  return normalizeQuizQuestions(raw, 5);
}

export function usesSinhalaMix(questions: QuizQuestion[]) {
  return questions.some((question) =>
    /[\u0D80-\u0DFF]/.test(
      [question.prompt, question.explanation, ...question.options].join(" "),
    ),
  );
}

export function quizMatchesAppLanguage(
  questions: QuizQuestion[],
  language?: AppLanguage,
) {
  if (!questions.length) return false;
  if (language === "english") return !usesSinhalaMix(questions);
  return usesSinhalaMix(questions);
}

export function scienceDailyFallback(
  language: AppLanguage = "singlish",
): QuizQuestion[] {
  if (language === "english") {
    return [
      {
        id: "g11-sci-fb-1",
        subject: "Science",
        prompt: "What is the main job of xylem tissue in a plant?",
        options: [
          "It carries water and minerals up",
          "It carries food only down",
          "It makes seeds",
          "It makes sound",
        ],
        answerIndex: 0,
        explanation:
          "Xylem carries water and minerals from the roots to the leaves.",
      },
      {
        id: "g11-sci-fb-2",
        subject: "Science",
        prompt: "Which pair is needed for photosynthesis?",
        options: [
          "Chlorophyll and sunlight",
          "Salt and wind",
          "Iron and sound",
          "Ice and snow",
        ],
        answerIndex: 0,
        explanation:
          "Chlorophyll absorbs light so the plant can make food.",
      },
      {
        id: "g11-sci-fb-3",
        subject: "Science",
        prompt: "What is the pump of human blood circulation?",
        options: ["Heart", "Liver", "Kidney", "Lung"],
        answerIndex: 0,
        explanation: "The heart pumps blood around the body.",
      },
      {
        id: "g11-sci-fb-4",
        subject: "Science",
        prompt: "What is the pH of an acid?",
        options: ["Below 7", "Exactly 7", "Above 14", "Only 0"],
        answerIndex: 0,
        explanation: "Acids have pH below 7. 7 is neutral.",
      },
      {
        id: "g11-sci-fb-5",
        subject: "Science",
        prompt: "What is heat?",
        options: [
          "Energy that moves because of a temperature difference",
          "A colour",
          "A weight",
          "A sound",
        ],
        answerIndex: 0,
        explanation:
          "Heat is energy that moves from a hotter place to a colder place.",
      },
      {
        id: "g11-sci-fb-6",
        subject: "Science",
        prompt: "What does phloem tissue carry?",
        options: ["Made food", "Only air", "Bone", "Blood"],
        answerIndex: 0,
        explanation: "Phloem carries food made in the leaves to other parts.",
      },
    ].slice(0, 5);
  }

  const si = {
    shaka: u(0x0dc1, 0x0dcf, 0x0d9a),
    wala: u(0x0dc0, 0x0dbd),
    xylem: u(0x0dc1, 0x0dda, 0x0dbd, 0x0db8),
    patakaye: u(0x0db4, 0x0da7, 0x0d9a, 0x0dba, 0x0dda),
    pradhana: u(0x0db4, 0x0dca, 0x200d, 0x0dbb, 0x0db0, 0x0dcf, 0x0db1),
    karya: u(0x0d9a, 0x0dcf, 0x0dbb, 0x0dca, 0x0dba, 0x0dba),
    kumakda: u(0x0d9a, 0x0dd4, 0x0db8, 0x0d9a, 0x0dca, 0x0daf, 0x003f),
    jalaya: u(0x0da2, 0x0dbd, 0x0dba),
    saha: u(0x0dc3, 0x0dc4),
    khanija: u(0x0d9b, 0x0db1, 0x0dd2, 0x0da2),
    ihalata: u(0x0d89, 0x0dc4, 0x0dc5, 0x0da7),
    genu: u(0x0d9c, 0x0dd9, 0x0db1),
    yanne: u(0x0dba, 0x0db1, 0x0dca, 0x0db1, 0x0dda),
    yanawa: u(0x0dba, 0x0db1, 0x0dc0, 0x0dcf),
    eka: u(0x0d91, 0x0d9a),
    karanawa: u(0x0d9a, 0x0dbb, 0x0db1, 0x0dc0, 0x0dcf),
    kolawala: u(0x0d9a, 0x0ddc, 0x0dc5, 0x0dc0, 0x0dbd),
    ahara: u(0x0d86, 0x0dc4, 0x0dcf, 0x0dbb),
    pahalata: u(0x0db4, 0x0dc4, 0x0dbd, 0x0da7),
    witharak: u(0x0dc0, 0x0dd2, 0x0dad, 0x0dbb, 0x0d9a, 0x0dca),
    beeja: u(0x0db6, 0x0dd3, 0x0da2),
    hadanawa: u(0x0dc4, 0x0daf, 0x0db1, 0x0dc0, 0x0dcf),
    shabdaya: u(0x0dc1, 0x0db6, 0x0dca, 0x0daf, 0x0dba, 0x0d9a, 0x0dca),
    mulein: u(0x0db8, 0x0dd4, 0x0dbd, 0x0dd9, 0x0db1, 0x0dca),
    kolawalata: u(0x0d9a, 0x0ddc, 0x0dc5, 0x0dc0, 0x0dbd, 0x0da7),
    photo: u(
      0x0db4,
      0x0dca,
      0x200d,
      0x0dbb,
      0x0db7,
      0x0dcf,
      0x0dc3,
      0x0d82,
      0x0dc1,
      0x0dca,
      0x0dbd,
      0x0dda,
      0x0dc2,
      0x0dab,
      0x0dba,
    ),
    ekata: u(0x0d91, 0x0d9a, 0x0da7),
    awashya: u(0x0d85, 0x0dc0, 0x0dc1, 0x0dca, 0x200d, 0x0dba),
    sadakaya: u(0x0dc3, 0x0dcf, 0x0db0, 0x0d9a, 0x0dba, 0x0d9a, 0x0dca),
    haritha: u(
      0x0dc4,
      0x0dbb,
      0x0dd2,
      0x0dad,
      0x0db4,
      0x0dca,
      0x200d,
      0x0dbb,
      0x0daf,
    ),
    alokaya: u(0x0d86, 0x0dbd, 0x0ddd, 0x0d9a, 0x0dba),
    lunu: u(0x0dbd, 0x0dd4, 0x0dab, 0x0dd4),
    sulanga: u(0x0dc3, 0x0dd4, 0x0dc5, 0x0d9f),
    yakada: u(0x0dba, 0x0d9a, 0x0da9),
    hima: u(0x0dc4, 0x0dd2, 0x0db8),
    ice: u(0x0d85, 0x0dba, 0x0dd2, 0x0dc3, 0x0dca),
    avashoshana: u(
      0x0d85,
      0x0dc0,
      0x0dc1,
      0x0ddd,
      0x0dc2,
      0x0dab,
      0x0dba,
    ),
    karala: u(0x0d9a, 0x0dbb, 0x0dbd, 0x0dcf),
    minisa: u(0x0db8, 0x0dd2, 0x0db1, 0x0dd2, 0x0dc3, 0x0dcf, 0x0d9c, 0x0dda),
    rudira: u(0x0dbb, 0x0dd4, 0x0db0, 0x0dd2, 0x0dbb),
    sansarana: u(0x0dc3, 0x0d82, 0x0dc3, 0x0dbb, 0x0dab, 0x0dba, 0x0dda),
    eke: u(0x0d91, 0x0d9a, 0x0dda),
    hrdaya: u(0x0dc4, 0x0dd8, 0x0daf, 0x0dba),
    akmawa: u(0x0d85, 0x0d9a, 0x0dca, 0x0db8, 0x0dcf, 0x0dc0),
    wakugaduwa: u(0x0dc0, 0x0d9a, 0x0dd4, 0x0d9c, 0x0da9, 0x0dd4, 0x0dc0),
    puppusaya: u(0x0db4, 0x0dd4, 0x0db4, 0x0dca, 0x0db5, 0x0dd4, 0x0dc3, 0x0dba),
    shariraya: u(0x0dc1, 0x0dbb, 0x0dd3, 0x0dbb, 0x0dba),
    pura: u(0x0db4, 0x0dd4, 0x0dbb, 0x0dcf),
    amlaya: u(0x0d85, 0x0db8, 0x0dca, 0x0dbd, 0x0dba, 0x0d9a),
    agaya: u(0x0d85, 0x0d9c, 0x0dba),
    kohomada: u(0x0d9a, 0x0ddc, 0x0dc4, 0x0ddc, 0x0db8, 0x0daf, 0x003f),
    aduyi: u(0x0d85, 0x0da9, 0x0dd4, 0x0dba, 0x0dd2),
    hariyatama: u(0x0dc4, 0x0dbb, 0x0dd2, 0x0dba, 0x0da7, 0x0db8),
    wadiyi: u(0x0dc0, 0x0dd0, 0x0da9, 0x0dd2, 0x0dba, 0x0dd2),
    amlawala: u(0x0d85, 0x0db8, 0x0dca, 0x0dbd, 0x0dc0, 0x0dbd),
    thapaya: u(0x0dad, 0x0dcf, 0x0db4, 0x0dba),
    kiyanne: u(0x0d9a, 0x0dd2, 0x0dba, 0x0db1, 0x0dca, 0x0db1, 0x0dda),
    ushnathwa: u(
      0x0d8b,
      0x0dc2,
      0x0dca,
      0x0dab,
      0x0dad,
      0x0dca,
      0x0dc0,
    ),
    wenasa: u(0x0dc0, 0x0dd9, 0x0db1, 0x0dc3),
    nisa: u(0x0db1, 0x0dd2, 0x0dc3, 0x0dcf),
    yana: u(0x0dba, 0x0db1),
    shaktiya: u(0x0dc1, 0x0d9a, 0x0dca, 0x0dad, 0x0dd2, 0x0dba),
    warnayak: u(0x0dc0, 0x0dbb, 0x0dca, 0x0dab, 0x0dba, 0x0d9a, 0x0dca),
    barak: u(0x0db6, 0x0dbb, 0x0d9a, 0x0dca),
    unusum: u(0x0d8b, 0x0dab, 0x0dd4, 0x0dc3, 0x0dd4, 0x0db8, 0x0dca),
    thenakin: u(0x0dad, 0x0dd0, 0x0db1, 0x0d9a, 0x0dd2, 0x0db1, 0x0dca),
    sithala: u(0x0dc3, 0x0dd3, 0x0dad, 0x0dbd),
    thenakata: u(0x0dad, 0x0dd0, 0x0db1, 0x0d9a, 0x0da7),
    phloem: u(0x0db4, 0x0dca, 0x0dbd, 0x0ddd, 0x0dba, 0x0db8),
    patakaya: u(0x0db4, 0x0da7, 0x0d9a, 0x0dba),
    sadana: u(0x0dc3, 0x0dcf, 0x0daf, 0x0db1),
    lada: u(0x0dbd, 0x0daf),
    vathaya: u(0x0dc0, 0x0dcf, 0x0dad, 0x0dba),
    asthi: u(0x0d85, 0x0dc3, 0x0dca, 0x0dae, 0x0dd2),
    hadunu: u(0x0dc4, 0x0dd0, 0x0daf, 0x0dd4, 0x0dab, 0x0dd4),
    anith: u(0x0d85, 0x0db1, 0x0dd2, 0x0dad, 0x0dca),
    kotaswalata: u(0x0d9a, 0x0ddc, 0x0da7, 0x0dc3, 0x0dca, 0x0dc0, 0x0dbd, 0x0da7),
  };

  return [
    {
      id: "g11-sci-fb-1",
      subject: "Science",
      prompt: `${si.shaka}${si.wala} ${si.xylem} (xylem) ${si.patakaye} ${si.pradhana} ${si.karya} ${si.kumakda}`,
      options: [
        `${si.jalaya} ${si.saha} ${si.khanija} ${si.ihalata} ${si.genu} ${si.yanawa}`,
        `${si.ahara} ${si.pahalata} ${si.witharak} ${si.genu} ${si.yanawa}`,
        `${si.beeja} ${si.hadanawa}`,
        `${si.shabdaya} ${si.hadanawa}`,
      ],
      answerIndex: 0,
      explanation: `${si.xylem} (xylem) ${si.mulein} ${si.kolawalata} ${si.jalaya} ${si.saha} ${si.khanija} ${si.genu} ${si.yanawa}.`,
    },
    {
      id: "g11-sci-fb-2",
      subject: "Science",
      prompt: `${si.photo} (Photosynthesis) ${si.ekata} ${si.awashya} ${si.sadakaya} ${si.kumakda}`,
      options: [
        `${si.haritha} (chlorophyll) ${si.saha} ${si.alokaya}`,
        `${si.lunu} ${si.saha} ${si.sulanga}`,
        `${si.yakada} ${si.saha} ${si.shabdaya}`,
        `${si.hima} ${si.saha} ${si.ice}`,
      ],
      answerIndex: 0,
      explanation: `${si.haritha} (chlorophyll) ${si.alokaya} ${si.avashoshana} ${si.karala} ${si.shaka} ${si.ahara} ${si.hadanawa}.`,
    },
    {
      id: "g11-sci-fb-3",
      subject: "Science",
      prompt: `${si.minisa} ${si.rudira} ${si.sansarana} pump ${si.eka} ${si.kumakda}`,
      options: [si.hrdaya, si.akmawa, si.wakugaduwa, si.puppusaya],
      answerIndex: 0,
      explanation: `${si.hrdaya} ${si.rudira} ${si.shariraya} ${si.pura} pump ${si.karanawa}.`,
    },
    {
      id: "g11-sci-fb-4",
      subject: "Science",
      prompt: `${si.amlaya} pH ${si.agaya} ${si.kohomada}`,
      options: [
        `7 ${u(0x0da7)} ${si.aduyi}`,
        `${si.hariyatama} 7${u(0x0dba, 0x0dd2)}`,
        `14${u(0x0da7)} ${si.wadiyi}`,
        `0 ${si.witharak}`,
      ],
      answerIndex: 0,
      explanation: `${si.amlawala} pH 7 ${u(0x0da7)} ${si.aduyi}. 7 neutral.`,
    },
    {
      id: "g11-sci-fb-5",
      subject: "Science",
      prompt: `${si.thapaya} (heat) ${si.kiyanne} ${si.kumakda}`,
      options: [
        `${si.ushnathwa} ${si.wenasa} ${si.nisa} ${si.yana} ${si.shaktiya}`,
        si.warnayak,
        si.barak,
        si.shabdaya,
      ],
      answerIndex: 0,
      explanation: `${si.thapaya} ${si.unusum} ${si.thenakin} ${si.sithala} ${si.thenakata} ${si.yana} ${si.shaktiya}.`,
    },
    {
      id: "g11-sci-fb-6",
      subject: "Science",
      prompt: `${si.phloem} (phloem) ${si.patakaya} ${si.genu} ${si.yanne} ${si.kumakda}`,
      options: [
        `${si.sadana} ${si.lada} ${si.ahara}`,
        `${si.vathaya} ${si.witharak}`,
        si.asthi,
        si.rudira,
      ],
      answerIndex: 0,
      explanation: `${si.phloem} ${si.kolawala} ${si.hadunu} ${si.ahara} ${si.anith} ${si.kotaswalata} ${si.genu} ${si.yanawa}.`,
    },
  ].slice(0, 5);
}
