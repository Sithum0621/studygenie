import { NextResponse } from "next/server";
import {
  formatSyllabusForAi,
  loadSyllabus,
  matchSyllabusUnits,
  parseSyllabusLevel,
} from "@/lib/syllabus";
import {
  retrieveScienceCorpus,
  shouldUseScienceCorpus,
} from "@/lib/science-corpus";
import { sanitizeText } from "@/lib/validate";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const grade = sanitizeText(url.searchParams.get("grade") || "", 40);
  const subject = sanitizeText(url.searchParams.get("subject") || "", 40);
  const query = sanitizeText(url.searchParams.get("q") || "", 200);
  const subjects = subject ? [subject] : [];
  return NextResponse.json({
    country: "LK",
    level: parseSyllabusLevel(grade),
    units: matchSyllabusUnits({ grade, subjects, query, limit: 12 }),
    map: formatSyllabusForAi({ grade, subjects, query }),
    source: loadSyllabus().name,
    pages: shouldUseScienceCorpus(grade, subject, query)
      ? retrieveScienceCorpus(`${subject} ${query}`, 3).map((page) => ({
          file_name: page.file_name,
          doc_type: page.doc_type,
          page_number: page.page_number,
          excerpt: page.content.slice(0, 280),
        }))
      : [],
  });
}
