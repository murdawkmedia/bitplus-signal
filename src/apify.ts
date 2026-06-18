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
    .replaceAll("&#39;", "'")
    .replaceAll("\u00e2\u20ac\u0153", "\"")
    .replaceAll("\u00e2\u20ac\ufffd", "\"")
    .replaceAll("\u00e2\u20ac\u009d", "\"")
    .replaceAll("\u00e2\u20ac\u02dc", "'")
    .replaceAll("\u00e2\u20ac\u2122", "'")
    .replaceAll("\u00e2\u20ac\u00a6", "...")
    .replaceAll("\u00e2\u20ac\u201c", "-")
    .replaceAll("\u00e2\u20ac\u201d", "-")
    .replaceAll("\u00c2", "")
    .replaceAll("\u201c", "\"")
    .replaceAll("\u201d", "\"")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u2026", "...")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-");
}

function withPublicDefaults(item: RawItem): RawItem {
  if (item.subreddit) return withRedditDefaults(item);
  if (isTikTokItem(item)) return withTikTokDefaults(item);
  if (isInstagramItem(item)) return withInstagramDefaults(item);
  if (isFacebookItem(item)) return withFacebookDefaults(item);
  if (isLinkedInItem(item)) return withLinkedInDefaults(item);
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

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = decodeHtml(value).trim();
    if (text) return text;
  }
  return "";
}

function urlFrom(item: RawItem, ...keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isLinkedInItem(item: RawItem): boolean {
  const url = urlFrom(item, "sourceUrl", "postUrl", "url", "link");
  return url.includes("linkedin.com") || item.authorName !== undefined || item.companyName !== undefined;
}

function isTikTokItem(item: RawItem): boolean {
  const url = urlFrom(item, "webVideoUrl", "videoUrl", "sourceUrl", "url");
  return url.includes("tiktok.com") || item.authorMeta !== undefined || item.createTimeISO !== undefined;
}

function isInstagramItem(item: RawItem): boolean {
  const url = urlFrom(item, "sourceUrl", "url", "postUrl", "link");
  return url.includes("instagram.com") || item.ownerUsername !== undefined || item.caption !== undefined;
}

function isFacebookItem(item: RawItem): boolean {
  const url = urlFrom(item, "sourceUrl", "postUrl", "url", "link");
  return url.includes("facebook.com") || item.pageName !== undefined || item.message !== undefined;
}

function withLinkedInDefaults(item: RawItem): RawItem {
  return {
    ...item,
    platform: "linkedin",
    sourceUrl: urlFrom(item, "sourceUrl", "postUrl", "url", "link"),
    publicName: stringValue(item.publicName, item.authorName, item.author, item.companyName, item.name),
    excerpt: stringValue(item.excerpt, item.text, item.content, item.postText, item.title),
    postedAt: item.postedAt ?? item.posted_at ?? item.createdAt ?? item.date ?? item.publishedAt,
    locationHint: item.locationHint ?? item.location ?? "unknown",
    topics: item.topics ?? item.tags ?? ["developer tools"],
    dataMode: "real_public",
    sourceLane: "apify_linkedin",
    provenanceNote: "reviewed public Apify LinkedIn scraper output",
    visibility: item.visibility ?? "public"
  };
}

function withTikTokDefaults(item: RawItem): RawItem {
  const author = nestedRecord(item.authorMeta ?? item.author);
  const handle = stringValue(author.name, author.uniqueId, author.userName, item.username).replace(/^@/, "");
  return {
    ...item,
    platform: "tiktok",
    sourceUrl: urlFrom(item, "sourceUrl", "webVideoUrl", "videoUrl", "url"),
    publicName: handle ? `@${handle}` : stringValue(author.nickName, item.publicName),
    excerpt: stringValue(item.excerpt, item.text, item.desc, item.description, item.title),
    postedAt: item.postedAt ?? item.createTimeISO ?? item.createdAt ?? item.date,
    locationHint: item.locationHint ?? item.location ?? "unknown",
    topics: item.topics ?? item.hashtags ?? ["developer tools"],
    dataMode: "real_public",
    sourceLane: "apify_tiktok",
    provenanceNote: "reviewed public Apify TikTok scraper output",
    visibility: item.visibility ?? "public"
  };
}

function withInstagramDefaults(item: RawItem): RawItem {
  const username = stringValue(item.ownerUsername, item.username, item.ownerFullName, item.publicName).replace(/^@/, "");
  return {
    ...item,
    platform: "instagram",
    sourceUrl: urlFrom(item, "sourceUrl", "url", "postUrl", "link"),
    publicName: username ? `@${username}` : "",
    excerpt: stringValue(item.excerpt, item.caption, item.text, item.title, item.alt),
    postedAt: item.postedAt ?? item.timestamp ?? item.createdAt ?? item.date,
    locationHint: item.locationHint ?? item.locationName ?? item.location ?? "unknown",
    topics: item.topics ?? item.hashtags ?? ["developer tools"],
    dataMode: "real_public",
    sourceLane: "apify_instagram",
    provenanceNote: "reviewed public Apify Instagram scraper output",
    visibility: item.visibility ?? "public"
  };
}

function withFacebookDefaults(item: RawItem): RawItem {
  return {
    ...item,
    platform: "facebook",
    sourceUrl: urlFrom(item, "sourceUrl", "postUrl", "url", "link"),
    publicName: stringValue(item.publicName, item.pageName, item.author, item.profileName, item.name),
    excerpt: stringValue(item.excerpt, item.message, item.text, item.content, item.description, item.title),
    postedAt: item.postedAt ?? item.time ?? item.createdAt ?? item.date,
    locationHint: item.locationHint ?? item.location ?? "unknown",
    topics: item.topics ?? item.tags ?? ["developer tools"],
    dataMode: "real_public",
    sourceLane: "apify_facebook",
    provenanceNote: "reviewed public Apify Facebook scraper output",
    visibility: item.visibility ?? "public"
  };
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
    topics: item.topics ?? item.tags ?? [subreddit ? `r/${subreddit}` : ""].filter(Boolean),
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
  maxChargedItems?: number;
}): Promise<unknown[]> {
  const token = options.token ?? process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is required for Apify imports.");
  const input = JSON.parse(await fs.readFile(options.inputFile, "utf8"));
  const actorPath = encodeURIComponent(apifyActorPath(options.actorId));
  const timeout = options.timeoutSeconds ?? 120;
  const maxChargedItems = options.maxChargedItems ?? Number(input.maxItems ?? input.maxPosts ?? input.resultsLimit ?? 100);
  const params = new URLSearchParams({
    timeout: String(timeout),
    clean: "true",
    maxItems: String(Math.max(1, maxChargedItems))
  });
  const response = await fetch(`https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Apify actor run failed with ${response.status}: ${body.slice(0, 500)}`);
  }
  const json = await response.json();
  return Array.isArray(json) ? json : [];
}
