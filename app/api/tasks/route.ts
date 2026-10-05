import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDailyTasks } from "@/lib/ai-service";
import { isAiConfigured, parseAiJson } from "@/lib/ai";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import {
  dailyTasksUserPrompt,
  generateSystemPrompt,
  parseStudentSnapshot,
  studentSnapshotSchema,
} from "@/lib/student-context";
import { withScienceCorpus } from "@/lib/science-corpus";
import { mockDailyTasks, parsePlanTasks } from "@/lib/tasks";
import { sanitizeMultiline } from "@/lib/validate";

export const maxDuration = 60;

const bodySchema = z.object({
  language: z.enum(["singlish", "english"]).optional(),
  date: z.string().max(32).optional(),
  note: z.string().max(2000).optional(),
  student: studentSnapshotSchema.optional(),
});

export async function POST(request: Request) {
  if (!allowRequest(`tasks:${clientKey(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const language = parsed.data.language ?? "singlish";
  const date = parsed.data.date || new Date().toISOString().slice(0, 10);
  const note = sanitizeMultiline(parsed.data.note || "", 2000);
  const snapshot = parseStudentSnapshot(parsed.data.student);
  const fallback = mockDailyTasks(language, date, note, snapshot);

  if (!isAiConfigured()) {
    return NextResponse.json({
      date,
      tasks: fallback,
      note:
        language === "english"
          ? "Demo plan from your recent study work."
          : "Demo plan eka oyage recent work eken haduna.",
      demo: true,
    });
  }

  try {
    const raw = await generateDailyTasks(
      generateSystemPrompt(language, snapshot),
      withScienceCorpus(
        dailyTasksUserPrompt(snapshot, date, language, note),
        `${snapshot.grade} ${snapshot.subjects.join(" ")} ${note}`,
        snapshot.grade,
        snapshot.subjects.join(" "),
      ),
    );
    const parsedJson = parseAiJson(raw || "");
    const tasks = parsePlanTasks(parsedJson, language);
    const coach =
      parsedJson &&
      typeof parsedJson === "object" &&
      typeof (parsedJson as { note?: unknown }).note === "string"
        ? String((parsedJson as { note: string }).note).trim()
        : "";
    return NextResponse.json({
      date,
      tasks: tasks.length ? tasks : fallback,
      note: coach,
      demo: false,
    });
  } catch {
    return NextResponse.json({
      date,
      tasks: fallback,
      note: "",
      demo: false,
    });
  }
}
