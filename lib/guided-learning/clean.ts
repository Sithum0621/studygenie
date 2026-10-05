const FIGURE = /(?:\(\s*)?\d+\.\d+\s*රූපය(?:\s*\))?/g;
const SECTION_NO = /^\s*\d+\.\d+(?:\.\d+)?\s*/;
const OCR_LATIN = /[A-Za-z]{5,}/g;
const OCR_COLON_JUNK = /:[^\n.]{0,80}\*/g;
const EXERCISE =
  /පහත සඳහන්[^.!?]*[.!?]?|හඳුනාගෙන නම් කරන්න[.!?]?|නම් කරන්න[.!?]?/g;
const GENERIC_ANALOGY =
  /එදිනෙදා දෙයකට සමානයි|කුට්ටියක්|මිත්‍රයක් එක කොටසක්/;

export function cleanScienceText(raw: string) {
  return raw
    .replace(/හැ`දින්වේ/g, "හඳුන්වයි")
    .replace(FIGURE, " ")
    .replace(OCR_COLON_JUNK, " ")
    .replace(OCR_LATIN, " ")
    .replace(EXERCISE, " ")
    .replace(/[`:•*_]+/g, " ")
    .replace(SECTION_NO, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeOcrDump(line: string) {
  if (/(?:\d+\.\d+\s*රූපය)/.test(line)) return true;
  if (/:[^\n.]{0,80}\*/.test(line)) return true;
  if (/\d+\.\d+\.\d+/.test(line)) return true;
  return line.length > 40 && /[A-Za-z]{8,}/.test(line);
}

export function usableFacts(points: string[], limit = 2) {
  const cleaned = points
    .map(cleanScienceText)
    .filter((point) => point.length >= 18 && !looksLikeOcrDump(point));
  const unique = [...new Set(cleaned)];
  return unique.slice(0, limit);
}

export function softenCheckpoint(raw: string) {
  const text = cleanScienceText(raw)
    .replace(/එක වාක්‍යයකින් කියන්න\.?/g, "")
    .replace(/කියන්න\.?$/g, "")
    .trim();
  if (!text) return "මේක ඔයාගේ වචනෙන් කියන්නකෝ — ඔයාට තේරුණේ මොකක්ද?";
  const core = text.replace(/\?+$/, "").trim();
  return `${core} කියල ඔයා හිතන්නේ මොකක්ද? ඔයාගේ වචනෙන් කියන්නකෝ.`;
}

export function everydayPicture(topicTitle: string, analogy: string) {
  const trimmed = cleanScienceText(analogy);
  if (trimmed && !GENERIC_ANALOGY.test(trimmed)) return trimmed;
  return `ගෙදරේ කාමර වෙනස් වැඩ වලට තියෙනවානේ. ${topicTitle}ත් ඒ වගේ — වෙනස් කොටස්, වෙනස් වැඩ.`;
}

const ROBOT_LINES = [
  /පොත්තේ පිටුවක් copy කරන්නේ නැහැ\.?/g,
  /පොතේන් පිටුවක් copy කරන්නේ නැහැ\.?/g,
  /අපි මේ කොටස තේරුණද කියල අහන්න\.?\s*වැරදුණත් කමක් නැහැ\.?/g,
  /අපි මේ කොටස හොරුණද කියල අහන්න\.?\s*වැරද්දන් කමක් නැහැ\.?/g,
  /එක වාක්‍යයකින් කියන්න\.?/g,
  /ඊළඟ topic එකට යන්නේ නැහැ\.?/g,
  /LOCKED TOPIC[^\n]*/gi,
  /FORBIDDEN[^\n]*/gi,
  /ACTION[^\n]*/gi,
];

export function polishTeacherReply(reply: string) {
  let text = reply;
  for (const pattern of ROBOT_LINES) {
    text = text.replace(pattern, "");
  }
  text = text
    .split("\n")
    .filter((line) => !looksLikeOcrDump(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}
