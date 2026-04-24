import { db } from "./db";

export async function getConfig(key: string): Promise<string | null> {
  const row = await db.config.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setConfig(key: string, value: string) {
  await db.config.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const rows = await db.config.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
