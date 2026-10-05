import {
  emptyGuidedState,
  firstIncompleteTopic,
  nextTopic as findNextTopic,
  topicById,
  topicsForUnit,
} from "./catalog";
import { classifyStudentIntent, isCheckpointCorrect } from "./classify";
import { polishTeacherReply } from "./clean";
import { inferStudentTalk } from "./style";
import { pickAnalogyIndex, renderGuidedLesson } from "./teach";
import type {
  CurriculumTopic,
  GuidedAction,
  GuidedTurnInput,
  GuidedTurnResult,
  StudentLearningState,
} from "./types";

function nowIso() {
  return new Date().toISOString();
}

function resolveTopic(
  unitId: string,
  state: StudentLearningState | null,
): CurriculumTopic | null {
  if (state?.currentTopicId) {
    const current = topicById(state.currentTopicId);
    if (current && current.unitId === unitId) return current;
  }
  return firstIncompleteTopic(unitId, state?.completedTopicIds || []);
}

function cloneState(
  base: StudentLearningState,
  patch: Partial<StudentLearningState>,
): StudentLearningState {
  return { ...base, ...patch, lastInteraction: nowIso() };
}

function focusFor(topic: CurriculumTopic, level: string) {
  return {
    subject: topic.subject,
    topic: `${topic.topicNo} ${topic.topicTitle}`,
    level,
  };
}

export function runGuidedTurn(input: GuidedTurnInput): GuidedTurnResult | null {
  const topics = topicsForUnit(input.unitId);
  if (!topics.length) return null;

  const incoming =
    input.state && input.state.unitId === input.unitId
      ? input.state
      : emptyGuidedState(input.studentId, input.unitId);
  if (!incoming) return null;

  const topic = resolveTopic(input.unitId, incoming);
  if (!topic) return null;

  const intent = classifyStudentIntent(input.message, input.kind, incoming.step);
  let state = incoming.currentTopicId === topic.id
    ? incoming
    : cloneState(incoming, { currentTopicId: topic.id, step: "intro" });

  let action: GuidedAction = "teach";
  let advanced = false;
  let correct: boolean | undefined;
  let analogyIndex = pickAnalogyIndex(
    topic.knowledge.analogies.length,
    state.usedAnalogyIndexes,
    0,
  );
  let locked = topic;
  let upcoming = findNextTopic(input.unitId, topic.id);

  if (intent === "clarify") {
    action = "reexplain";
    analogyIndex = pickAnalogyIndex(
      topic.knowledge.analogies.length,
      state.usedAnalogyIndexes,
      state.clarificationCount + 1,
    );
    state = cloneState(state, {
      step: "checkpoint",
      clarificationCount: state.clarificationCount + 1,
      usedAnalogyIndexes: [...state.usedAnalogyIndexes, analogyIndex].slice(-6),
    });
  } else if (intent === "question") {
    action = "answer_question";
    state = cloneState(state, { step: "checkpoint" });
  } else if (intent === "understood" || intent === "check_answer") {
    correct =
      intent === "understood" ||
      isCheckpointCorrect(input.message, topic.knowledge.checkpointOk);
    if (correct) {
      const completed = Array.from(
        new Set([...state.completedTopicIds, topic.id]),
      );
      const nxt = findNextTopic(input.unitId, topic.id);
      upcoming = nxt;
      advanced = true;
      if (nxt) {
        action = "advance";
        locked = nxt;
        analogyIndex = 0;
        state = cloneState(state, {
          currentTopicId: nxt.id,
          step: "checkpoint",
          clarificationCount: 0,
          usedAnalogyIndexes: [0],
          completedTopicIds: completed,
        });
      } else {
        action = "unit_done";
        state = cloneState(state, {
          step: "completed",
          completedTopicIds: completed,
        });
      }
    } else {
      action = "retry_check";
      analogyIndex = pickAnalogyIndex(
        topic.knowledge.analogies.length,
        state.usedAnalogyIndexes,
        state.clarificationCount + 1,
      );
      state = cloneState(state, {
        step: "checkpoint",
        usedAnalogyIndexes: [...state.usedAnalogyIndexes, analogyIndex].slice(-6),
      });
    }
  } else {
    action = "teach";
    state = cloneState(state, {
      currentTopicId: topic.id,
      step: "checkpoint",
      usedAnalogyIndexes: Array.from(
        new Set([...state.usedAnalogyIndexes, analogyIndex]),
      ),
    });
  }

  const talk = inferStudentTalk(input.history || [], input.message);
  const teachTopic = action === "advance" && upcoming ? topic : locked;
  const reply = polishTeacherReply(
    renderGuidedLesson({
      action,
      topic: teachTopic,
      nextTopic: action === "advance" ? upcoming : null,
      analogyIndex: action === "advance" ? 0 : analogyIndex,
      question: input.message,
      talk,
    }),
  );

  const display = action === "advance" && upcoming ? upcoming : locked;
  const lessonComplete =
    state.step === "completed" ||
    state.completedTopicIds.length >= topics.length;

  return {
    reply,
    state,
    intent,
    action,
    advanced,
    partDone: advanced,
    correct,
    lessonComplete,
    lockedTopicId: display.id,
    lockedTopicNo: display.topicNo,
    analogyIndex,
    topic: display,
    nextTopic: upcoming && action === "advance" ? upcoming : findNextTopic(input.unitId, display.id),
    focus: focusFor(
      display,
      state.clarificationCount > 1 ? "confused" : "some-idea",
    ),
  };
}
