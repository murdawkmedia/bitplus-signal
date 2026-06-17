import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import {
  ConferenceEvent,
  ConferenceEventSchema,
  PublicSignal
} from "./types.js";
import { normalizeSignals } from "./normalize.js";

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

export async function readEvents(file: string): Promise<ConferenceEvent[]> {
  const raw = await readJson(file);
  const rows = Array.isArray(raw) ? raw : (raw as { events?: unknown[] }).events ?? [];
  return rows.map((row) => ConferenceEventSchema.parse(row));
}

export async function readSignals(file: string): Promise<PublicSignal[]> {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".csv") {
    const content = await fs.readFile(file, "utf8");
    const rows = parse(content, { columns: true, skip_empty_lines: true }) as Record<string, unknown>[];
    return normalizeSignals(rows);
  }
  const raw = await readJson(file);
  const rows = Array.isArray(raw) ? raw : (raw as { signals?: unknown[] }).signals ?? [];
  return normalizeSignals(rows as Record<string, unknown>[]);
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

