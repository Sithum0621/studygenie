const hits = new Map<string, { count: number; startedAt: number }>();

export function allowRequest(key: string, max = 40, windowMs = 60_000) {
  const now = Date.now();
  const row = hits.get(key);
  if (!row || now - row.startedAt > windowMs) {
    hits.set(key, { count: 1, startedAt: now });
    return true;
  }
  row.count += 1;
  return row.count <= max;
}

export function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}
