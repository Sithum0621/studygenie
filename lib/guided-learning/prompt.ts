import { TEACHER_PRINCIPLES } from "../teacher-principles";
import {
  cleanScienceText,
  everydayPicture,
  polishTeacherReply,
  softenCheckpoint,
  usableFacts,
} from "./clean";
import { describeStudentTalk, type StudentTalk } from "./style";
import type {
  CurriculumTopic,
  GuidedAction,
  StudentIntent,
  StudentLearningState,
} from "./types";

export const GUIDED_TEACHER_SYSTEM_PROMPT = `${TEACHER_PRINCIPLES}

Stay on the locked topic. Notes are private knowledge — rewrite, never paste.
If they are lost, retell the SAME idea with a NEW everyday picture.
If they answered your last guiding question well, take ONE small next step — still guide, don't dump.
If they were wrong, do not scold; nudge with a simpler hint and a gentler question.

Return ONLY the chat message. No JSON. No English plan.`;

export function buildGuidedUserPrompt(input: {
  intent: StudentIntent;
  action: GuidedAction;
  state: StudentLearningState;
  topic: CurriculumTopic;
  nextTopic: CurriculumTopic | null;
  analogy: string;
  studentMessage: string;
  talk: StudentTalk;
  studentFacts?: string;
}) {
  const { topic, nextTopic, state, intent, action, analogy, studentMessage, talk, studentFacts } =
    input;
  const facts = usableFacts(topic.knowledge.summaryPoints, 3);
  const picture = everydayPicture(topic.topicTitle, analogy);
  const nextLine =
    action === "advance" && nextTopic
      ? `You may now start chatting about ${nextTopic.topicNo} ${nextTopic.topicTitle} — still as a conversation, not a syllabus announcement.`
      : `Stay on ${topic.topicNo} ${topic.topicTitle} only. Do not name other topics.`;

  return `${describeStudentTalk(talk)}
${studentFacts ? `\nTHIS STUDENT (use when answering):\n${studentFacts}\n` : ""}
LOCKED IDEA: ${topic.topicNo} ${topic.topicTitle}
UNIT: ${topic.unitNo} ${topic.unitTitle}
STEP: ${state.step}
INTENT: ${intent}
ACTION: ${action}
${nextLine}

Private notes (rewrite into spoken chat; never paste):
${facts.map((point) => `- ${point}`).join("\n") || `- ${cleanScienceText(topic.knowledge.cleanedContent).slice(0, 400)}`}
Key terms to land naturally: ${topic.knowledge.keyTerms.join(", ")}
Everyday picture you MAY use if it fits: ${picture}
Curious question to aim at (rephrase, do not paste): ${softenCheckpoint(topic.knowledge.checkpoint)}

Student just said:
${studentMessage || "(they opened the lesson)"}`;
}

export { polishTeacherReply };

export function leakedOtherTopic(
  reply: string,
  current: CurriculumTopic,
  topics: CurriculumTopic[],
) {
  return topics.some(
    (topic) =>
      topic.id !== current.id &&
      (reply.includes(topic.topicNo) || reply.includes(topic.topicTitle)),
  );
}
