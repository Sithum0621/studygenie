export type StudentTalk = {
  script: "sinhala" | "english" | "mix";
  casual: boolean;
  short: boolean;
  usesEnglishTerms: boolean;
  last: string;
};

function isKickoff(text: string) {
  return (
    /^lesson\s+/i.test(text.trim()) ||
    /Teach this part from textbook/i.test(text) ||
    /check question ekak ahanna/i.test(text) ||
    text.length > 360
  );
}

export function realStudentMessage(text: string) {
  const trimmed = text.trim();
  if (!trimmed || isKickoff(trimmed)) return "";
  return trimmed;
}

export function inferStudentTalk(
  history: { role: string; content: string }[],
  lastMessage: string,
): StudentTalk {
  const userTurns = [
    ...history.filter((turn) => turn.role === "user").map((turn) => turn.content),
    lastMessage,
  ]
    .map((text) => text.trim())
    .filter((text) => text && !isKickoff(text))
    .slice(-8);

  const blob = userTurns.join("\n");
  const sinhala = (blob.match(/[\u0D80-\u0DFF]/g) || []).length;
  const latin = (blob.match(/[A-Za-z]/g) || []).length;
  const avg =
    userTurns.reduce((sum, text) => sum + text.length, 0) /
    Math.max(userTurns.length, 1);

  let script: StudentTalk["script"] = "sinhala";
  if (latin > sinhala * 2) script = "english";
  else if (sinhala && latin > 12) script = "mix";

  return {
    script,
    casual:
      avg < 90 ||
      /නේ|නෙද|නං|කෝ|බං|යාලු|නැද්ද|කියල|therun|neda|\bne\b|\bko\b/i.test(
        blob,
      ),
    short: avg < 70,
    usesEnglishTerms: sinhala > 8 && /[A-Za-z]{3,}/.test(blob),
    last: (userTurns.at(-1) || "").slice(0, 280),
  };
}

export function describeStudentTalk(talk: StudentTalk) {
  const bits = [
    `script=${talk.script}`,
    talk.casual ? "casual school-chat" : "a bit more school-like",
    talk.short ? "short messages" : "medium messages",
    talk.usesEnglishTerms
      ? "drops English science words inside Sinhala"
      : "mostly one script",
  ];
  return `STUDENT VOICE: ${bits.join("; ")}
Last real student line: ${talk.last || "(they just opened the lesson — greet them like a person)"}
Match their script: Sinhala Unicode if they wrote Sinhala; Latin Singlish if they wrote Singlish; English if they wrote English.
Mirror their length and warmth. If they are short, you be short. End with one guiding question.`;
}
