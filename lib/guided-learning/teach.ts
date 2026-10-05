import voice from "@/data/guided-learning/voice.json";
import {
  everydayPicture,
  softenCheckpoint,
  usableFacts,
} from "./clean";
import type { StudentTalk } from "./style";
import type { CurriculumTopic, GuidedAction } from "./types";

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function joinChat(parts: (string | undefined)[]) {
  return parts
    .map((part) =>
      part
        ?.replace(/\s+,/g, ",")
        .replace(/,\s+,/g, ",")
        .replace(/\s+\./g, ".")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

function spokenIdea(topic: CurriculumTopic) {
  const facts = usableFacts(topic.knowledge.summaryPoints, 1);
  if (!facts[0]) {
    return `${topic.topicTitle} කියන්නේ එක වැඩක් කරන කොටස් එකතුවක් වගේ.`;
  }
  const first = facts[0].split(". ")[0]?.trim() || facts[0];
  const short = first.length > 180 ? `${first.slice(0, 170).trim()}…` : first;
  return `ඒ කියන්නේ මෙහෙමයි — ${short}`;
}

function curiousAsk(topic: CurriculumTopic, talk?: StudentTalk) {
  const question = softenCheckpoint(topic.knowledge.checkpoint);
  if (talk?.short) return question;
  return `${question} තේරුණේ නැත්නම් අහන්න, මම තව විදිහකින් කියනවා.`;
}

export function pickAnalogyIndex(
  count: number,
  used: number[],
  prefer: number,
) {
  if (count <= 0) return 0;
  for (let i = 0; i < count; i += 1) {
    const index = (prefer + i) % count;
    if (!used.includes(index)) return index;
  }
  return prefer % count;
}

export function matchKnowledgeSnippet(topic: CurriculumTopic, question: string) {
  const hay = question.toLowerCase();
  const hit = topic.knowledge.keyTerms.find((term) =>
    hay.includes(term.toLowerCase()),
  );
  const facts = usableFacts(topic.knowledge.summaryPoints, 3);
  if (hit) {
    const related =
      facts.find((point) => point.includes(hit)) || facts[0] || "";
    return related;
  }
  return facts[0] || spokenIdea(topic);
}

export function renderGuidedLesson(input: {
  action: GuidedAction;
  topic: CurriculumTopic;
  nextTopic?: CurriculumTopic | null;
  analogyIndex: number;
  question?: string;
  talk?: StudentTalk;
}) {
  const { action, topic, nextTopic, analogyIndex, question, talk } = input;
  const picture = everydayPicture(
    topic.topicTitle,
    topic.knowledge.analogies[analogyIndex] ||
      topic.knowledge.analogies[0] ||
      "",
  );
  const greeting = talk?.casual === false ? "" : `${voice.friend}, `;
  const vars = {
    friend: talk?.casual === false ? "" : voice.friend,
    hello: greeting,
    letsThink: voice.letsThink,
    topic_no: topic.topicNo,
    topic_title: topic.topicTitle,
    picture,
    analogy: picture,
    next_no: nextTopic?.topicNo || "",
    next_title: nextTopic?.topicTitle || "",
  };
  const intro = fill(voice.intro, vars).replace(/^,\s*/, "").replace(/\s{2,}/g, " ");
  const idea = spokenIdea(topic);
  const ask = curiousAsk(topic, talk);

  if (action === "reexplain") {
    return joinChat([
      fill(voice.clarifyLead, vars),
      picture,
      idea,
      ask,
    ]);
  }
  if (action === "answer_question") {
    return joinChat([
      fill(voice.questionLead, vars),
      picture,
      ask,
    ]);
  }
  if (action === "retry_check") {
    return joinChat([
      fill(voice.wrongLead, vars),
      picture,
      idea,
      ask,
    ]);
  }
  if (action === "advance") {
    const praise = fill(voice.praise, vars);
    if (!nextTopic) {
      return joinChat([praise, fill(voice.unitDone, vars)]);
    }
    const nextPicture = everydayPicture(
      nextTopic.topicTitle,
      nextTopic.knowledge.analogies[0] || "",
    );
    return joinChat([
      praise,
      fill(voice.nextUnlock, vars),
      nextPicture,
      spokenIdea(nextTopic),
      curiousAsk(nextTopic, talk),
    ]);
  }
  if (action === "unit_done") {
    return joinChat([fill(voice.praise, vars), fill(voice.unitDone, vars)]);
  }
  return joinChat([intro, picture, idea, ask]);
}
