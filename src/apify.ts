import fs from "node:fs/promises";
import { normalizeSignals } from "./normalize.js";
import { PublicSignal } from "./types.js";

type RawItem = Record<string, unknown>;

export function apifyActorPath(actorId: string): string {
  return actorId.includes("~") ? actorId : actorId.replace("/", "~");
}

function withPublicDefaults(item: RawItem): RawItem {
  return {
    platform: item.platform ?? item.source ?? item.network ?? "apify",
    sourceUrl: item.sourceUrl ?? item.url ?? item.postUrl ?? item.link,
    publicName: item.publicName ?? item.author ?? item.username ?? item.handle,
    excerpt: item.excerpt ?? item.text ?? item.content ?? item.caption ?? item.title,
    postedAt: item.postedAt ?? item.createdAt ?? item.timestamp ?? item.date,
    locationHint: item.locationHint ?? item.location ?? item.city ?? "unknown",
    topics: item.topics ?? item.tags ?? item.hashtags ?? item.keywords,
    profileRefs: item.profileRefs ?? item.profile_refs ?? item.profile_ref ?? item.author_ref,
    conferenceRefs: item.conferenceRefs ?? item.conference_refs ?? item.conference_ref ?? item.event_refs,
    visibility: item.visibility ?? "public"
  };
}

export function normalizeApifyItems(items: unknown[]): PublicSignal[] {
  return normalizeSignals(items.map((item) => withPublicDefaults((item ?? {}) as RawItem)));
}

export async function runApifyActor(options: {
  actorId: string;
  inputFile: string;
  token?: string;
  timeoutSeconds?: number;
}): Promise<unknown[]> {
  const token = options.token ?? process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is required for Apify imports.");
  const input = JSON.parse(await fs.readFile(options.inputFile, "utf8"));
  const actorPath = encodeURIComponent(apifyActorPath(options.actorId));
  const timeout = options.timeoutSeconds ?? 120;
  const response = await fetch(`https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?timeout=${timeout}&clean=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error(`Apify actor run failed with ${response.status}`);
  const json = await response.json();
  return Array.isArray(json) ? json : [];
}
