import { AudienceScope, ConferenceEvent, GeoTier, PublicSignal, TopicPolicy } from "./types.js";

export interface GeoAudienceClassification {
  geoTier: GeoTier;
  audienceScope: AudienceScope;
  topicPolicy: TopicPolicy;
  normalizedLocation: string;
  geoReason: string;
}

const LOCATION_ALIASES: Array<{ pattern: RegExp; location: string }> = [
  { pattern: /\b(atx|austin,?\s*tx)\b/i, location: "austin" },
  { pattern: /\b(nyc|new york city|brooklyn|manhattan)\b/i, location: "new york" },
  { pattern: /\b(sf|san fran|bay area|oakland)\b/i, location: "san francisco" },
  { pattern: /\b(la|los angeles)\b/i, location: "los angeles" },
  { pattern: /\b(dc|washington,?\s*dc)\b/i, location: "washington" },
  { pattern: /\b(kw|kitchener-waterloo|kitchener waterloo)\b/i, location: "waterloo" },
  { pattern: /\b(gta|yyz|ytz|greater toronto area)\b/i, location: "toronto" }
];

const TORONTO_LOCAL_AREA = [
  "toronto",
  "mississauga",
  "brampton",
  "hamilton",
  "kitchener",
  "waterloo",
  "guelph",
  "london",
  "windsor",
  "niagara",
  "markham",
  "richmond hill",
  "oakville",
  "burlington",
  "barrie",
  "kingston",
  "ottawa",
  "buffalo",
  "rochester",
  "detroit",
  "cleveland"
];

const TORONTO_NEAR_DIRECT_3H = [
  "atlanta",
  "boston",
  "chicago",
  "halifax",
  "montreal",
  "new york",
  "washington",
  "winnipeg"
];

const GENERIC_LOCATION_HINTS = new Set([
  "unknown",
  "worldwide",
  "global",
  "earth",
  "remote",
  "internet",
  "everywhere",
  "n/a",
  "na"
]);

function clean(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s,+.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function locationSeeds(event: ConferenceEvent): string[] {
  return [...new Set([
    event.city,
    ...event.airports,
    ...event.directFlightFrom,
    ...TORONTO_LOCAL_AREA,
    ...TORONTO_NEAR_DIRECT_3H,
    "calgary",
    "edmonton",
    "vancouver",
    "seattle",
    "san francisco",
    "los angeles",
    "austin",
    "denver",
    "dallas",
    "miami",
    "london"
  ].map(clean).filter(Boolean))];
}

function includesLocation(text: string, location: string): boolean {
  if (!location) return false;
  return new RegExp(`(^|[^a-z0-9])${location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(text);
}

export function normalizeLocationHint(locationHint: string, event: ConferenceEvent): string {
  const hint = clean(locationHint || "");
  if (!hint || !/[a-z0-9]/i.test(hint) || GENERIC_LOCATION_HINTS.has(hint)) return "unknown";

  for (const alias of LOCATION_ALIASES) {
    if (alias.pattern.test(locationHint) || alias.pattern.test(hint)) return alias.location;
  }

  for (const seed of locationSeeds(event)) {
    if (includesLocation(hint, seed)) return seed;
  }

  if (includesLocation(hint, clean(event.country))) return clean(event.country);
  return hint;
}

function isTorontoTarget(event: ConferenceEvent): boolean {
  return event.id === "btcpp-toronto-2026" || clean(event.city) === "toronto";
}

function localAreaSeeds(event: ConferenceEvent): string[] {
  if (isTorontoTarget(event)) return TORONTO_LOCAL_AREA;
  return [clean(event.city)];
}

function nearDirectSeeds(event: ConferenceEvent): string[] {
  if (isTorontoTarget(event)) return TORONTO_NEAR_DIRECT_3H;
  return event.directFlightFrom.map(clean);
}

export function classifyGeoAudience(signal: PublicSignal, event: ConferenceEvent): GeoAudienceClassification {
  const normalizedLocation = normalizeLocationHint(signal.locationHint || "", event);
  if (normalizedLocation === "unknown") {
    return {
      geoTier: "unknown_location",
      audienceScope: "bitcoin_only",
      topicPolicy: "needs_location_review",
      normalizedLocation,
      geoReason: "No usable public location hint; keep visible only for Bitcoin/freedom-tech review."
    };
  }

  if (localAreaSeeds(event).includes(normalizedLocation)) {
    return {
      geoTier: "local_area",
      audienceScope: "broad_builder_crypto",
      topicPolicy: "broad_allowed",
      normalizedLocation,
      geoReason: "Toronto-area or five-hour drive-region location; broad builder-crypto targeting is allowed."
    };
  }

  if (nearDirectSeeds(event).includes(normalizedLocation)) {
    return {
      geoTier: "near_direct_3h",
      audienceScope: "broad_builder_crypto",
      topicPolicy: "broad_allowed",
      normalizedLocation,
      geoReason: "Curated near-direct seed for the under-three-hour Toronto flight band; broad builder-crypto targeting is allowed."
    };
  }

  if (event.directFlightFrom.map(clean).includes(normalizedLocation)) {
    return {
      geoTier: "long_direct_or_far",
      audienceScope: "bitcoin_only",
      topicPolicy: "bitcoin_required",
      normalizedLocation,
      geoReason: "Direct-flight seed in the longer-than-three-hour band; use Bitcoin/freedom-tech relevance only."
    };
  }

  return {
    geoTier: "long_direct_or_far",
    audienceScope: "bitcoin_only",
    topicPolicy: "bitcoin_required",
    normalizedLocation,
    geoReason: "Far or unmapped public location; use Bitcoin/freedom-tech relevance only."
  };
}
