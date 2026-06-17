import fs from "node:fs/promises";
import { normalizeSignals } from "./normalize.js";
import { PublicSignal } from "./types.js";

type RawItem = Record<string, unknown>;

export function apifyActorPath(actorId: string): string {
  return actorId.includes("~") ? actorId : actorId.replace("/", "~");
}

function decodeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function withPublicDefaults(item: RawItem): RawItem {
  if (item.subreddit) return withRedditDefaults(item);
  if (item.author && item.url && item.text) return withXDefaults(item);
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

function nestedRecord(value: unknown): RawItem {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RawItem : {};
}

function withXDefaults(item: RawItem): RawItem {
  const author = nestedRecord(item.author);
  const authorText = typeof item.author === "string" ? item.author : "";
  const userName = String(author.userName ?? author.username ?? author.handle ?? authorText).replace(/^@/, "").trim();
  return {
    ...item,
    platform: "x",
    sourceUrl: item.sourceUrl ?? item.url ?? item.tweetUrl,
    publicName: userName ? `@${userName}` : String(author.name ?? item.publicName ?? ""),
    excerpt: decodeHtml(item.text ?? item.fullText ?? item.content),
    postedAt: item.createdAt ?? item.created_at ?? item.date,
    locationHint: author.location ?? item.locationHint ?? "unknown",
    topics: item.topics ?? item.hashtags ?? ["bitcoin", "developer tools"],
    profileRefs: item.profileRefs ?? item.profile_refs ?? item.profile_ref ?? (userName ? [`x:${userName}`] : []),
    conferenceRefs: item.conferenceRefs ?? item.conference_refs ?? item.conference_ref ?? [],
    dataMode: "real_public",
    sourceLane: "apify_x",
    provenanceNote: "reviewed public Apify X scraper output",
    visibility: item.visibility ?? "public"
  };
}

function withRedditDefaults(item: RawItem): RawItem {
  const title = String(item.title ?? "").trim();
  const selfText = String(item.selfText ?? item.body ?? "").trim();
  const excerpt = [title, selfText].filter(Boolean).join(" ");
  const author = String(item.author ?? "").replace(/^u\//, "").trim();
  const subreddit = String(item.subreddit ?? "").replace(/^r\//, "").trim();
  return {
    ...item,
    platform: "reddit",
    sourceUrl: item.url ?? item.permalink ?? item.link,
    publicName: author ? `u/${author}` : "",
    excerpt,
    postedAt: item.createdAt ?? item.created_at ?? item.date,
    locationHint: item.locationHint ?? "unknown",
    topics: ["bitcoin", "developer tools", subreddit ? `r/${subreddit}` : ""].filter(Boolean),
    profileRefs: item.profileRefs ?? item.profile_refs ?? [],
    conferenceRefs: item.conferenceRefs ?? item.conference_refs ?? [],
    dataMode: "real_public",
    sourceLane: "apify_reddit",
    provenanceNote: "reviewed public Apify Reddit scraper output",
    visibility: item.visibility ?? "public"
  };
}

function hasUsablePublicText(item: RawItem): boolean {
  if (item.noResults) return false;
  const row = withPublicDefaults(item);
  return Boolean(row.sourceUrl && row.excerpt);
}

export function normalizeApifyItems(items: unknown[]): PublicSignal[] {
  return normalizeSignals(items
    .map((item) => (item ?? {}) as RawItem)
    .filter(hasUsablePublicText)
    .map((item) => withPublicDefaults(item)));
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
