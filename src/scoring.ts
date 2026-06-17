import {
  ConferenceEvent,
  GateClass,
  PublicSignal,
  SignalMatch,
  TrustGraph,
  TravelMatch
} from "./types.js";
import { trustSignalForEvent } from "./trust.js";

const TOPIC_KEYWORDS = [
  "bitcoin",
  "btc",
  "nostr",
  "open source",
  "oss",
  "developer",
  "dev",
  "protocol",
  "consensus",
  "payments",
  "lightning",
  "privacy",
  "cryptography",
  "wallet",
  "hackathon",
  "workshop",
  "zk",
  "ethereum",
  "defi"
];

const REGION_HINTS: Record<string, string[]> = {
  africa: ["kenya", "nairobi", "lagos", "accra", "cairo", "addis", "cape town", "johannesburg"],
  north_america: ["canada", "usa", "united states", "toronto", "montreal", "vancouver", "calgary", "edmonton", "new york", "austin", "san francisco", "seattle"],
  europe: ["germany", "berlin", "paris", "london", "amsterdam", "vienna", "riga", "warsaw", "zurich", "lisbon", "madrid", "rome"],
  asia_pacific: ["korea", "south korea", "seoul", "tokyo", "taipei", "singapore", "hong kong", "manila", "bangkok", "osaka", "shanghai"]
};

function clean(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function dateDaysAgo(date: string): number | undefined {
  const t = Date.parse(date);
  if (!Number.isFinite(t)) return undefined;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function gateSignal(signal: PublicSignal): GateClass {
  if (["private", "dm", "login_gated"].includes(signal.visibility)) return "blocked_private";
  if (signal.visibility === "unknown") return "public_ambiguous";
  return "public_ok";
}

export function topicMatches(signal: PublicSignal, event: ConferenceEvent): string[] {
  const text = clean(`${signal.excerpt} ${signal.topics.join(" ")}`);
  const eventTags = event.tags.map(clean);
  const matched = new Set<string>();
  for (const keyword of TOPIC_KEYWORDS) {
    if (text.includes(keyword)) matched.add(keyword);
  }
  for (const tag of eventTags) {
    if (tag && text.includes(tag)) matched.add(tag);
  }
  return [...matched];
}

export function travelMatch(signal: PublicSignal, event: ConferenceEvent): TravelMatch {
  const hint = clean(signal.locationHint || "");
  if (!hint || hint === "unknown") return "unknown";
  if (hint.includes(clean(event.city)) || hint.includes(clean(event.country))) return "local";
  if (event.directFlightFrom.some((city) => hint.includes(clean(city)))) return "direct_flight_seed";
  if ((REGION_HINTS[event.region] ?? []).some((regionHint) => hint.includes(regionHint))) return "same_region";
  return "unknown";
}

function travelScore(match: TravelMatch): number {
  if (match === "local") return 30;
  if (match === "direct_flight_seed") return 24;
  if (match === "same_region") return 12;
  return 4;
}

function freshnessScore(postedAt: string): number {
  const days = dateDaysAgo(postedAt);
  if (days === undefined) return 2;
  if (days <= 7) return 15;
  if (days <= 30) return 10;
  if (days <= 90) return 5;
  return 1;
}

function topicScore(matches: string[]): number {
  if (matches.length === 0) return 0;
  return Math.min(35, 15 + matches.length * 5);
}

function engagementScore(signal: PublicSignal): number {
  if (signal.sourceUrl.startsWith("http") || signal.sourceUrl.startsWith("nostr:")) return 10;
  return 3;
}

function datesLabel(event: ConferenceEvent): string {
  return `${event.startDate} to ${event.endDate}`;
}

function draft(signal: PublicSignal, event: ConferenceEvent, matches: string[]): string {
  const topics = matches.slice(0, 3).join(", ") || event.edition;
  return `Public draft, human review required: This looks right up the ${event.name} alley. ${event.name} is the ${event.edition} edition in ${event.city}, ${event.country} (${datesLabel(event)}), with a focus around ${topics}. Details: ${event.url}`;
}

export function scoreSignalForEvent(signal: PublicSignal, event: ConferenceEvent, graph?: TrustGraph): SignalMatch {
  const gate = gateSignal(signal);
  const topics = topicMatches(signal, event);
  const travel = travelMatch(signal, event);
  const trust = gate === "blocked_private"
    ? { trustScore: 0, conferenceAffinityScore: 0, trustReasons: [] }
    : trustSignalForEvent(signal, event, graph);
  const topic = topicScore(topics);
  const travelPoints = travelScore(travel);
  const fresh = freshnessScore(signal.postedAt);
  const engage = engagementScore(signal);
  const blockedPenalty = gate === "blocked_private" ? 100 : gate === "public_ambiguous" ? 12 : 0;
  const score = Math.max(0, Math.min(100, topic + travelPoints + fresh + engage + trust.trustScore + trust.conferenceAffinityScore - blockedPenalty));
  const signalId = signal.id ?? "sig-unknown";
  const matchId = `${signalId}-${event.id}`;
  return {
    matchId,
    signalId,
    eventId: event.id,
    eventName: event.name,
    eventEdition: event.edition,
    eventCity: event.city,
    eventCountry: event.country,
    eventDates: datesLabel(event),
    eventUrl: event.url,
    platform: signal.platform,
    sourceUrl: signal.sourceUrl,
    publicName: signal.publicName,
    excerpt: signal.excerpt,
    postedAt: signal.postedAt,
    locationHint: signal.locationHint,
    topics: signal.topics,
    topicMatch: topics,
    travelMatch: travel,
    gate,
    dataMode: signal.dataMode,
    sourceLane: signal.sourceLane,
    provenanceNote: signal.provenanceNote,
    trustScore: trust.trustScore,
    conferenceAffinityScore: trust.conferenceAffinityScore,
    trustReasons: trust.trustReasons,
    score,
    scoreBreakdown: `v2:T${topic}+R${travelPoints}+F${fresh}+E${engage}+W${trust.trustScore}+C${trust.conferenceAffinityScore}-B${blockedPenalty}=${score}`,
    approvalStatus: gate === "blocked_private" ? "blocked_private" : "needs_human_review",
    reachPath: gate === "blocked_private" ? "" : signal.sourceUrl,
    draftPublicReply: gate === "blocked_private" ? "" : draft(signal, event, topics)
  };
}

export function buildMatches(events: ConferenceEvent[], signals: PublicSignal[], graph?: TrustGraph): SignalMatch[] {
  const rows: SignalMatch[] = [];
  for (const signal of signals) {
    const scored = events
      .map((event) => scoreSignalForEvent(signal, event, graph))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    rows.push(...scored);
  }
  return rows.sort((a, b) => b.score - a.score || a.eventName.localeCompare(b.eventName));
}
