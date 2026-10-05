import type { AppLanguage } from "./copy";
import type { QuizQuestion, StudyMedium } from "./types";

export const STUDY_MEDIUMS: StudyMedium[] = ["sinhala", "english", "tamil"];

export function parseStudyMedium(value: unknown): StudyMedium {
  if (value === "english" || value === "tamil" || value === "sinhala") {
    return value;
  }
  return "sinhala";
}

export function languageSubjectKind(
  subject: string,
): "english" | "tamil" | "sinhala" | "content" {
  const hay = subject.toLowerCase();
  if (hay.includes("english") || hay.includes("ඉංග්‍රීසි")) return "english";
  if (hay.includes("tamil") || hay.includes("தமிழ்") || hay.includes("දෙමළ")) {
    return "tamil";
  }
  if (hay.includes("sinhala") || hay.includes("සිංහල")) return "sinhala";
  return "content";
}

export type ContentScript = "singlish" | "english" | "tamil" | "sinhala";

export function contentScriptForSubject(
  subject: string,
  medium: StudyMedium,
  appLanguage: AppLanguage,
): ContentScript {
  const kind = languageSubjectKind(subject);
  if (kind === "english") return "english";
  if (kind === "tamil") return "tamil";
  if (kind === "sinhala") return "sinhala";
  if (medium === "english") return "english";
  if (medium === "tamil") return "tamil";
  return appLanguage === "english" ? "english" : "singlish";
}

function scriptLine(script: ContentScript) {
  if (script === "english") {
    return "full English only. No Sinhala or Tamil script.";
  }
  if (script === "tamil") {
    return "Tamil (தமிழ் script) only. No Latin Singlish. No Sinhala script.";
  }
  if (script === "sinhala") {
    return `Sinhala Unicode (සිංහල). If an English school word is needed, put the Sinhala meaning in parentheses right after it: quiz (ප්‍රශ්නාවලිය), grammar (ව්‍යාකරණ). No Latin Singlish like eka karanna.`;
  }
  return `MOSTLY Sinhala Unicode. English only for a rare proper term (Photosynthesis, Newton, Password, ICT).
Whenever you keep an English term, put the Sinhala meaning in parentheses immediately after it.
GOOD: "Photosynthesis (ඡායාසංශ්ලේෂණය) කියන්නේ ශාක මොකද හදන ක්‍රියාවලියක්ද?"
GOOD: "Password (මුරපදය) එකක් ශක්තිමත් කරන්න ඕන නම් මොකද ගන්න ඕන?"
BAD: "Photosynthesis කියන්නේ plants වලින් food හදන process එකක්ද?"
BAD: "Photosynthesis kiyanne plants walin food hadana process ekakda?"
Write the rest of the sentence in Sinhala: ශාක, ආහාර, භාගය, ක්‍රියාවලිය, මතක තියාගන්න.
NO Latin Singlish: never write eka, eke, karanna, mokada, kiyanne.
NO full-English sentences.`;
}

export function educationalLanguageRules(
  medium: StudyMedium,
  appLanguage: AppLanguage,
  kind: "questions" | "chat",
) {
  const piece =
    kind === "questions"
      ? "every prompt, option, explanation, and correct-answer text"
      : "the teaching reply, examples, corrections, and check questions";
  const contentScript = contentScriptForSubject("Science", medium, appLanguage);

  return `LANGUAGE RULES — follow per subject, not one language for the whole set.
School medium: ${medium} (Sri Lanka: Sinhala / English / Tamil medium).
App language: ${appLanguage}.

Language subjects (always this language, ignore medium):
- English subject: ${piece} in ${scriptLine("english")}
- Tamil subject: ${piece} in ${scriptLine("tamil")}
- Sinhala subject: ${piece} in ${scriptLine("sinhala")}

Other subjects (Maths, Science, History, ICT, ...):
- ${piece} in ${scriptLine(contentScript)}

If the student answers a check, keep the SAME language as that subject's rule.`;
}

export function hasSinhalaScript(text: string) {
  return /[\u0D80-\u0DFF]/.test(text);
}

export function hasTamilScript(text: string) {
  return /[\u0B80-\u0BFF]/.test(text);
}

export function isSinhalaEnglishMix(text: string) {
  if (hasTamilScript(text) || !hasSinhalaScript(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const latin = words.filter((word) => /[A-Za-z]{3,}/.test(word)).length;
  return latin / words.length <= 0.4;
}

function questionText(question: QuizQuestion) {
  return [question.prompt, question.explanation, ...question.options].join(" ");
}

export function contentQuestionsMatchScript(
  questions: QuizQuestion[],
  medium: StudyMedium,
  appLanguage: AppLanguage,
) {
  const content = questions.filter(
    (question) => languageSubjectKind(question.subject || "") === "content",
  );
  if (!content.length) return true;
  if (medium === "english" || appLanguage === "english") {
    return content.every(
      (question) =>
        !hasSinhalaScript(questionText(question)) &&
        !hasTamilScript(questionText(question)),
    );
  }
  if (medium === "tamil") {
    return content.every((question) => hasTamilScript(questionText(question)));
  }
  return content.every((question) =>
    isSinhalaEnglishMix(questionText(question)),
  );
}
