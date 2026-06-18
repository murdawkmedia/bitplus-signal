import {
  ConferenceEvent,
  EvidenceLevel,
  GateClass,
  PublicSignal,
  QualityClass,
  SignalMatch,
  TrustGraph,
  TravelMatch
} from "./types.js";
import { classifyGeoAudience } from "./geoAudience.js";
import { trustSignalForEvent } from "./trust.js";

export { classifyGeoAudience } from "./geoAudience.js";

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
  const geo = classifyGeoAudience(signal, event);
  if (geo.geoTier === "local_area") return "local";
  if (geo.geoTier === "near_direct_3h" || event.directFlightFrom.some((city) => geo.normalizedLocation === clean(city))) {
    return "direct_flight_seed";
  }
  if ((REGION_HINTS[event.region] ?? []).some((regionHint) => hint.includes(regionHint))) return "same_region";
  return "unknown";
}

function geoScore(geoTier: ReturnType<typeof classifyGeoAudience>["geoTier"], match: TravelMatch): number {
  if (geoTier === "local_area") return 30;
  if (geoTier === "near_direct_3h") return 24;
  if (geoTier === "long_direct_or_far") return 10;
  if (match === "same_region") return 8;
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

function evidenceLevel(signal: PublicSignal): EvidenceLevel {
  if (signal.sourceLane === "nostr_graph") return "trust_candidate";
  if (signal.sourceLane === "conference_window_crossover") return "crossover_event_page";
  if (signal.sourceLane === "adjacent_event_official") return "official_event_page";
  return "public_content";
}

function evidencePenalty(level: EvidenceLevel): number {
  return level === "trust_candidate" ? 50 : 0;
}

function qualityClass(level: EvidenceLevel, gate: GateClass, draftText: string): QualityClass {
  if (gate === "blocked_private") return "blocked";
  if (level === "trust_candidate") return "trust_candidate";
  if (level === "official_event_page" || level === "crossover_event_page") return "event_context";
  if (draftText.trim()) return "reply_target";
  return "research_lead";
}

function datesLabel(event: ConferenceEvent): string {
  return `${event.startDate} to ${event.endDate}`;
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function eventMention(event: ConferenceEvent): string {
  return event.city.toLowerCase() === "toronto" ? "BTC++ Toronto" : event.name;
}

function rowFingerprint(signal: PublicSignal): number {
  return Array.from(`${signal.id || ""}${signal.sourceUrl}${signal.publicName}`)
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function publicName(signal: PublicSignal, fallback: string): string {
  return signal.publicName?.trim() || fallback;
}

function nostrGraphSummary(signal: PublicSignal): string {
  const incoming = signal.excerpt.match(/followed by (\d+) seed-adjacent/i)?.[1];
  const outgoing = signal.excerpt.match(/follows (\d+) public/i)?.[1];
  if (incoming && outgoing) return `${incoming} seed-adjacent connection${incoming === "1" ? "" : "s"} and ${outgoing} public follows`;
  if (incoming) return `${incoming} seed-adjacent connection${incoming === "1" ? "" : "s"}`;
  const variants = [
    "a public Nostr graph overlap",
    "a seed-adjacent Nostr overlap",
    "a Bitcoin-builder Nostr overlap"
  ];
  return variants[rowFingerprint(signal) % variants.length];
}

function draft(signal: PublicSignal, event: ConferenceEvent, matches: string[]): string {
  const topics = signal.topics ?? [];
  const conferenceRefs = signal.conferenceRefs ?? [];
  const text = clean(`${signal.platform} ${signal.sourceLane} ${signal.excerpt} ${topics.join(" ")} ${conferenceRefs.join(" ")}`);
  const eventName = eventMention(event);
  const name = publicName(signal, "this public signal");

  if (signal.sourceLane === "conference_window_crossover") {
    if (includesAny(text, ["canada crypto week", "side event", "side events", "community partners", "sponsors"])) {
      return `${name} is right in the same Toronto week, so the useful overlap is finding builders already in town who care about open systems, custody, privacy, or Bitcoin protocol work.`;
    }
    if (includesAny(text, ["ai futurist", "artificial intelligence", "ai"])) {
      return `${name} brings the AI crowd into the same venue window. From the BTC++ side, the interesting overlap is builders thinking about open infrastructure, trust, and systems that need careful technical review.`;
    }
    return `${name} lands close enough to ${eventName} that crossover is worth watching. The goal is to spot technical attendees already nearby, not spray everyone with a conference pitch.`;
  }

  if (signal.sourceLane === "adjacent_event_official") {
    if (includesAny(text, ["btc++", "btcplusplus", "btcpp", "bitcoin++"])) {
      return `Good home base for the ${eventName} conversation. We are keeping the emphasis on Bitcoin protocol, consensus, and useful technical discussion rather than just broadcasting a link.`;
    }
    if (includesAny(text, ["hackathon", "hackathons", "waterloo", "mississauga", "jamhacks", "conhacks", "bearhacks", "hack canada"])) {
      return `${name} looks like real builder energy close to Toronto. If teams from there are drifting toward Bitcoin, self-custody, privacy, or protocol work, ${eventName} should be a natural next conversation.`;
    }
    if (includesAny(text, ["ethereum", "web3", "defi", "blockchain futurist", "ethwomen", "ethtoronto"])) {
      return `${name} should pull in a lot of Web3 builders. From the BTC++ side, the interesting overlap is where open systems, custody, privacy, and protocol design meet.`;
    }
    return `${name} feels like a strong nearby signal for serious software people. ${eventName} is coming at it from the Bitcoin protocol and consensus angle, so there is useful overlap without needing the hard sell.`;
  }

  if (signal.sourceLane === "nostr_graph" || (signal.platform === "nostr" && text.includes("trust graph"))) {
    return `Seeing ${nostrGraphSummary(signal)} around Bitcoin builders. If Toronto is on your radar this summer, ${eventName} is where we are trying to get more protocol and consensus people into the same room.`;
  }

  if (includesAny(text, ["btc++", "btcplusplus", "btcpp", "bitcoin++"])) {
    if (includesAny(text, ["ticket", "tickets"])) {
      return `Appreciate the ticket nudge. For us the useful part is getting the right builders into the BTC++ Toronto conversation around Bitcoin protocol, consensus, and tradeoffs worth debating.`;
    }
    if (includesAny(text, ["presentation", "slides", "talk"])) {
      return `That presentation tease is exactly the kind of technical breadcrumb we like seeing before BTC++ Toronto. Curious where the protocol or consensus angle lands once it is in the room.`;
    }
    if (signal.excerpt.trim().length <= 12) {
      return `Caught the quiet ${eventName} signal. We are keeping the focus on builders and the technical questions around Bitcoin consensus rather than blasting links everywhere.`;
    }
    return `Appreciate the ${eventName} mention. We are trying to keep the conversation useful for builders, especially around Bitcoin protocol, consensus, and the questions worth arguing through in person.`;
  }

  if (includesAny(text, ["stablecoin", "stablecoins", "cbdc", "tokenized", "payments", "settlement"])) {
    return `This is a good thread. The stablecoins, privacy, and accountability angle is exactly where protocol people can add useful nuance. ${eventName} is more Bitcoin and consensus focused, but this is the kind of conversation we want near it.`;
  }

  if (includesAny(text, ["hackathon", "hackathons", "shipped", "shipping", "prototype", "build weekend"])) {
    return `Love seeing hackathon builders shipping in the region. If any of those teams are getting pulled toward Bitcoin, self-custody, privacy, or protocol work, ${eventName} should be an interesting room to know about.`;
  }

  if (includesAny(text, ["ethereum", "web3", "defi", "zk", "zero knowledge", "blockchain futurist", "ethwomen", "ethtoronto"])) {
    return `Appreciate the builder energy here. The Bitcoin side is wrestling with a lot of the same open-systems questions from a different direction; ${eventName} will be a good place for the protocol-curious crowd to compare notes.`;
  }

  if (includesAny(text, ["privacy", "cryptography", "security", "open source", "open-source", "ai", "developer tools"])) {
    const topic = matches.find((match) => ["privacy", "cryptography", "open source", "developer", "dev", "protocol", "consensus"].includes(match)) || "open technical work";
    return `This is the kind of ${topic} conversation we like seeing around Toronto. ${eventName} is focused on the deeper Bitcoin protocol side, so the overlap with builders here feels pretty natural.`;
  }

  const matchedTopics = matches.slice(0, 2).join(" and ") || event.edition;
  return `Interesting signal for the builder crowd. The ${matchedTopics} overlap is what caught our eye, and ${eventName} is meant to be a place for that kind of technical conversation without the hype cycle.`;
}

export function scoreSignalForEvent(signal: PublicSignal, event: ConferenceEvent, graph?: TrustGraph): SignalMatch {
  const gate = gateSignal(signal);
  const topics = topicMatches(signal, event);
  const travel = travelMatch(signal, event);
  const geo = classifyGeoAudience(signal, event);
  const evidence = evidenceLevel(signal);
  const trust = gate === "blocked_private"
    ? { trustScore: 0, conferenceAffinityScore: 0, trustReasons: [] }
    : trustSignalForEvent(signal, event, graph);
  const topic = topicScore(topics);
  const geoPoints = geoScore(geo.geoTier, travel);
  const fresh = freshnessScore(signal.postedAt);
  const engage = engagementScore(signal);
  const blockedPenalty = gate === "blocked_private" ? 100 : gate === "public_ambiguous" ? 12 : 0;
  const evidencePoints = evidencePenalty(evidence);
  const score = Math.max(0, Math.min(100, topic + geoPoints + fresh + engage + trust.trustScore + trust.conferenceAffinityScore - blockedPenalty - evidencePoints));
  const signalId = signal.id ?? "sig-unknown";
  const matchId = `${signalId}-${event.id}`;
  const draftPublicReply = gate === "blocked_private" || evidence === "trust_candidate" ? "" : draft(signal, event, topics);
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
    geoTier: geo.geoTier,
    audienceScope: geo.audienceScope,
    topicPolicy: geo.topicPolicy,
    normalizedLocation: geo.normalizedLocation,
    geoReason: geo.geoReason,
    evidenceLevel: evidence,
    qualityClass: qualityClass(evidence, gate, draftPublicReply),
    gate,
    dataMode: signal.dataMode,
    sourceLane: signal.sourceLane,
    provenanceNote: signal.provenanceNote,
    trustScore: trust.trustScore,
    conferenceAffinityScore: trust.conferenceAffinityScore,
    trustReasons: trust.trustReasons,
    score,
    scoreBreakdown: `v4:T${topic}+G${geoPoints}+F${fresh}+E${engage}+W${trust.trustScore}+C${trust.conferenceAffinityScore}-B${blockedPenalty}-Q${evidencePoints}=${score}`,
    approvalStatus: gate === "blocked_private" ? "blocked_private" : "needs_human_review",
    reachPath: gate === "blocked_private" ? "" : signal.sourceUrl,
    draftPublicReply
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
