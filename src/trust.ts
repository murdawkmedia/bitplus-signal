import { ConferenceEvent, PublicSignal, TrustGraph, TrustProfile } from "./types.js";

export interface TrustResult {
  trustScore: number;
  conferenceAffinityScore: number;
  trustReasons: string[];
}

function clean(value: string): string {
  return value.toLowerCase().replace(/^@/, "").replace(/\s+/g, " ").trim();
}

function inferredProfileRef(signal: PublicSignal): string {
  const name = clean(signal.publicName || "");
  if (!name) return "";
  return `${clean(signal.platform)}:${name}`;
}

function labelFor(profile: TrustProfile | undefined, id: string): string {
  return profile?.label || id;
}

function topicOverlap(a: string[], b: string[]): string[] {
  const left = new Set(a.map(clean));
  return b.map(clean).filter((topic) => left.has(topic));
}

function nearestSeedReason(
  profile: TrustProfile,
  profiles: Map<string, TrustProfile>,
  seeds: Set<string>
): { points: number; reason: string } {
  if (profile.trustSeed || seeds.has(profile.id)) {
    return { points: 30, reason: `${profile.label} is a trust seed` };
  }

  for (const seedId of seeds) {
    const seed = profiles.get(seedId);
    if (profile.follows.includes(seedId)) {
      return { points: 22, reason: `${profile.label} follows ${labelFor(seed, seedId)}` };
    }
    if (profile.followedBy.includes(seedId)) {
      return { points: 20, reason: `${profile.label} is followed by ${labelFor(seed, seedId)}` };
    }
  }

  for (const midId of profile.follows) {
    const mid = profiles.get(midId);
    if (!mid) continue;
    const connectsToSeed = mid.trustSeed || mid.follows.some((id) => seeds.has(id)) || mid.followedBy.some((id) => seeds.has(id));
    if (connectsToSeed) {
      return { points: 12, reason: `${profile.label} is two hops from ${labelFor(mid, midId)}` };
    }
  }

  return { points: 0, reason: "" };
}

export function trustSignalForEvent(signal: PublicSignal, event: ConferenceEvent, graph?: TrustGraph): TrustResult {
  if (!graph) return { trustScore: 0, conferenceAffinityScore: 0, trustReasons: [] };

  const profiles = new Map(graph.profiles.map((profile) => [profile.id, profile]));
  const seeds = new Set(graph.profiles.filter((profile) => profile.trustSeed).map((profile) => profile.id));
  const profileRefs = new Set([...(signal.profileRefs ?? []), inferredProfileRef(signal)].filter(Boolean));
  const reasons: string[] = [];
  let trustScore = 0;

  for (const profileRef of profileRefs) {
    const profile = profiles.get(profileRef);
    if (!profile) continue;
    const nearest = nearestSeedReason(profile, profiles, seeds);
    if (nearest.points > trustScore) trustScore = nearest.points;
    if (nearest.reason) reasons.push(nearest.reason);
  }

  const conferenceRefs = new Set([
    ...(signal.conferenceRefs ?? []),
    ...[...profileRefs].flatMap((id) => profiles.get(id)?.conferenceRefs ?? [])
  ]);
  const conferenceMap = new Map(graph.conferences.map((conference) => [conference.id, conference]));
  let conferenceAffinityScore = 0;
  for (const ref of conferenceRefs) {
    const conference = conferenceMap.get(ref);
    if (!conference) continue;
    const overlap = topicOverlap(event.tags, conference.topics);
    const points = overlap.length > 0 ? 8 : 4;
    conferenceAffinityScore += points;
    reasons.push(`${conference.name} affinity${overlap.length ? ` (${overlap.join(", ")})` : ""}`);
  }

  return {
    trustScore: Math.min(30, trustScore),
    conferenceAffinityScore: Math.min(18, conferenceAffinityScore),
    trustReasons: [...new Set(reasons)].slice(0, 6)
  };
}
