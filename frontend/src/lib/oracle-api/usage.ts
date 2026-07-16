import { kvGet, kvIncr, kvSet } from "./store";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

export async function recordUsage(keyId: string, route: string): Promise<{ day: number; month: number }> {
  const d = dayKey();
  const m = monthKey();
  const dayK = `oracle:usage:${keyId}:day:${d}`;
  const monthK = `oracle:usage:${keyId}:month:${m}`;
  const routeK = `oracle:usage:${keyId}:route:${d}:${route}`;

  const [day, month] = await Promise.all([kvIncr(dayK), kvIncr(monthK), kvIncr(routeK)]);
  // expire daily counters after 3 days (best-effort for upstash; memory ignores)
  await kvSet(dayK, String(day), 3 * 24 * 3600).catch(() => {});
  await kvSet(routeK, String(await kvGet(routeK) ?? "1"), 3 * 24 * 3600).catch(() => {});

  return { day, month };
}

export async function getUsage(keyId: string): Promise<{
  day: number;
  month: number;
  dayKey: string;
  monthKey: string;
}> {
  const d = dayKey();
  const m = monthKey();
  const day = Number((await kvGet(`oracle:usage:${keyId}:day:${d}`)) ?? "0");
  const month = Number((await kvGet(`oracle:usage:${keyId}:month:${m}`)) ?? "0");
  return { day, month, dayKey: d, monthKey: m };
}
