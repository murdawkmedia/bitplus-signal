import crypto from "node:crypto";
import { PublicSignal, PublicSignalSchema } from "./types.js";

type RawRow = Record<string, unknown>;

const FIELD_ALIASES: Record<string, string[]> = {
  platform: ["platform", "source_platform", "network", "channel"],
  sourceUrl: ["sourceUrl", "source_url", "source_url_full", "url", "link", "note_url"],
  publicName: ["publicName", "public_name", "public_name_or_org", "handle", "author", "name"],
  excerpt: ["excerpt", "message_text_public_excerpt", "text", "content", "body"],
  postedAt: ["postedAt", "posted_at", "date_of_message", "date_of_post", "created_at", "date"],
  locationHint: ["locationHint", "location_hint", "location", "city", "geo_town"],
  visibility: ["visibility", "privacy_review", "channel_class"],
  topics: ["topics", "intent_keywords", "tags", "keywords"]
};

function pick(row: RawRow, key: string): unknown {
  for (const alias of FIELD_ALIASES[key] ?? [key]) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== "") return row[alias];
  }
  return undefined;
}

function normalizeVisibility(value: unknown): PublicSignal["visibility"] {
  const raw = String(value ?? "public").toLowerCase();
  if (raw.includes("private") || raw.includes("blocked_private")) return "private";
  if (raw.includes("dm") || raw.includes("message")) return "dm";
  if (raw.includes("login") || raw.includes("gated")) return "login_gated";
  if (raw.includes("unknown") || raw.includes("needs_review")) return "unknown";
  return "public";
}

function splitTopics(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  return String(value ?? "")
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stableSignalId(signal: Pick<PublicSignal, "sourceUrl" | "excerpt">): string {
  const hash = crypto
    .createHash("sha1")
    .update(`${signal.sourceUrl}\n${signal.excerpt}`)
    .digest("hex")
    .slice(0, 10);
  return `sig-${hash}`;
}

export function normalizeSignal(row: RawRow): PublicSignal {
  const candidate = {
    id: String(pick(row, "id") ?? ""),
    platform: String(pick(row, "platform") ?? "unknown"),
    sourceUrl: String(pick(row, "sourceUrl") ?? ""),
    publicName: String(pick(row, "publicName") ?? ""),
    excerpt: String(pick(row, "excerpt") ?? ""),
    postedAt: String(pick(row, "postedAt") ?? ""),
    locationHint: String(pick(row, "locationHint") ?? "unknown"),
    topics: splitTopics(pick(row, "topics")),
    visibility: normalizeVisibility(pick(row, "visibility"))
  };
  const parsed = PublicSignalSchema.parse(candidate);
  return {
    ...parsed,
    id: parsed.id || stableSignalId(parsed)
  };
}

export function normalizeSignals(rows: RawRow[]): PublicSignal[] {
  return rows.map(normalizeSignal);
}

