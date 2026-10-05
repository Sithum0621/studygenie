export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const UPLOAD_ACCEPT = ".pdf,.txt,.md,.doc,.docx";
export const POLL_UPLOAD_ACCEPT = ".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.jfif";

const ALLOWED_EXT = new Set(["pdf", "txt", "md", "doc", "docx"]);

const BLOCKED_EXT = new Set([
  "html",
  "htm",
  "shtml",
  "xhtml",
  "js",
  "mjs",
  "cjs",
  "ts",
  "jsx",
  "tsx",
  "php",
  "phtml",
  "asp",
  "aspx",
  "jsp",
  "svg",
  "xml",
  "exe",
  "bat",
  "cmd",
  "com",
  "scr",
  "vbs",
  "ps1",
  "sh",
  "jar",
  "wasm",
  "hta",
  "apk",
  "dll",
  "so",
  "py",
  "rb",
  "pl",
  "cgi",
]);

const MIME_BY_EXT: Record<string, string[]> = {
  pdf: ["application/pdf", "application/octet-stream", ""],
  jpg: ["image/jpeg", "image/jpg", "application/octet-stream", ""],
  jpeg: ["image/jpeg", "image/jpg", "image/pjpeg", "application/octet-stream", ""],
  jfif: ["image/jpeg", "image/jpg", "image/pjpeg", "application/octet-stream", ""],
  png: ["image/png", "application/octet-stream", ""],
  webp: ["image/webp", "application/octet-stream", ""],
  txt: ["text/plain", "application/octet-stream", ""],
  md: ["text/markdown", "text/plain", "application/octet-stream", ""],
  doc: ["application/msword", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
    "application/zip",
  ],
};

export type UploadFailReason = "empty" | "tooBig" | "type" | "unsafe";

export type UploadCheck =
  | { ok: true; fileName: string }
  | { ok: false; reason: UploadFailReason };

function extOf(name: string) {
  const base = name.split(/[/\\]/).pop() || name;
  const parts = base.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] || "";
}

function startsWith(bytes: Uint8Array, magic: number[]) {
  if (bytes.length < magic.length) return false;
  return magic.every((value, index) => bytes[index] === value);
}

function looksLikeScript(bytes: Uint8Array) {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, 4096))
    .toLowerCase();
  return (
    /<script[\s>/]/i.test(head) ||
    /javascript:/i.test(head) ||
    /<html[\s>]/i.test(head) ||
    /<!doctype\s+html/i.test(head) ||
    /<\?php/i.test(head) ||
    /on\w+\s*=/i.test(head)
  );
}

export function sanitizeFilename(name: string) {
  const base = (name.split(/[/\\]/).pop() || "file")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim();
  const clipped = base.slice(0, 120) || "file";
  const ext = extOf(clipped);
  if (BLOCKED_EXT.has(ext)) return "file.txt";
  return clipped;
}

export function sanitizeText(input: string, max = 2000) {
  return input
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeMultiline(input: string, max = 20_000) {
  return input
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .slice(0, max);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function validateCredentials(input: {
  name?: string;
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const name = input.name == null ? undefined : sanitizeText(input.name, 80);
  if (name !== undefined && !name) return { ok: false as const, reason: "name" };
  if (!isValidEmail(email)) return { ok: false as const, reason: "email" };
  if (password.length < 6 || password.length > 72) {
    return { ok: false as const, reason: "password" };
  }
  return { ok: true as const, email, password, name };
}

export async function inspectUpload(file: File | null): Promise<UploadCheck> {
  if (!file || file.size <= 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "tooBig" };

  const fileName = sanitizeFilename(file.name);
  const ext = extOf(fileName);
  if (!ext || BLOCKED_EXT.has(ext) || !ALLOWED_EXT.has(ext)) {
    return { ok: false, reason: "type" };
  }

  const mime = (file.type || "").toLowerCase();
  const allowedMimes = MIME_BY_EXT[ext] || [];
  if (mime && !allowedMimes.includes(mime)) {
    return { ok: false, reason: "type" };
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (ext === "pdf" && !startsWith(head, [0x25, 0x50, 0x44, 0x46])) {
    return { ok: false, reason: "type" };
  }
  if (ext === "docx" && !startsWith(head, [0x50, 0x4b])) {
    return { ok: false, reason: "type" };
  }
  if (ext === "doc" && !startsWith(head, [0xd0, 0xcf, 0x11, 0xe0])) {
    return { ok: false, reason: "type" };
  }
  if (ext === "txt" || ext === "md") {
    const sample = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
    if (looksLikeScript(sample)) return { ok: false, reason: "unsafe" };
  }

  return { ok: true, fileName };
}

export async function inspectPollUpload(file: File | null): Promise<UploadCheck> {
  if (!file || file.size <= 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "tooBig" };

  const fileName = sanitizeFilename(file.name);
  const ext = extOf(fileName);
  const pollExt = new Set(["pdf", "jpg", "jpeg", "png", "webp", "jfif"]);
  if (!ext || BLOCKED_EXT.has(ext) || !pollExt.has(ext)) {
    return { ok: false, reason: "type" };
  }

  const mime = (file.type || "").toLowerCase();
  const allowedMimes = MIME_BY_EXT[ext] || [];
  if (mime && !allowedMimes.includes(mime)) {
    return { ok: false, reason: "type" };
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (ext === "pdf" && !startsWith(head, [0x25, 0x50, 0x44, 0x46])) {
    return { ok: false, reason: "type" };
  }
  if ((ext === "jpg" || ext === "jpeg" || ext === "jfif") && !startsWith(head, [0xff, 0xd8, 0xff])) {
    return { ok: false, reason: "type" };
  }
  if (ext === "png" && !startsWith(head, [0x89, 0x50, 0x4e, 0x47])) {
    return { ok: false, reason: "type" };
  }
  if (ext === "webp") {
    const tag = String.fromCharCode(...head.slice(0, 4));
    const webp = String.fromCharCode(...head.slice(8, 12));
    if (tag !== "RIFF" || webp !== "WEBP") return { ok: false, reason: "type" };
  }

  return { ok: true, fileName };
}

export function pollMimeForName(fileName: string) {
  const ext = extOf(fileName);
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg" || ext === "jfif") return "image/jpeg";
  return "application/octet-stream";
}

export async function extractUploadText(file: File, fileName: string) {
  const ext = extOf(fileName);
  if (ext !== "txt" && ext !== "md") return "";
  try {
    const text = await file.text();
    return sanitizeMultiline(text, 20_000);
  } catch {
    return "";
  }
}
