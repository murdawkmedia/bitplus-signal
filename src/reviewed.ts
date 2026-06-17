import { nip19 } from "nostr-tools";
import { PublicSignal, TrustGraph, TrustProfile } from "./types.js";

interface ReviewedOptions {
  limit: number;
  sourceLane: string;
  postedAt: string;
}

function hexFromProfileId(id: string): string {
  return id.startsWith("nostr:") ? id.slice("nostr:".length) : id;
}

function npubUrl(profile: TrustProfile): string {
  const hex = hexFromProfileId(profile.id);
  if (!/^[0-9a-f]{64}$/i.test(hex)) return profile.id;
  return `https://njump.me/${nip19.npubEncode(hex)}`;
}

function trustWeight(profile: TrustProfile): number {
  return (profile.followedBy ?? []).length * 10 + (profile.follows ?? []).length * 2 + (profile.conferenceRefs ?? []).length;
}

function excerpt(profile: TrustProfile): string {
  const incoming = (profile.followedBy ?? []).length;
  const outgoing = (profile.follows ?? []).length;
  const topics = profile.topics ?? [];
  const topicText = topics.length ? ` Topics: ${topics.join(", ")}.` : "";
  return `Reviewed real public-data candidate from the public Nostr trust graph near BTC++ Toronto seeds. Public graph evidence: followed by ${incoming} seed-adjacent profile(s), follows ${outgoing} public profile(s).${topicText}`;
}

export function signalsFromTrustGraph(graph: TrustGraph, options: ReviewedOptions): PublicSignal[] {
  return graph.profiles
    .filter((profile) => !profile.trustSeed)
    .filter((profile) => (profile.followedBy ?? []).length > 0 || (profile.follows ?? []).length > 0)
    .sort((a, b) => trustWeight(b) - trustWeight(a) || a.id.localeCompare(b.id))
    .slice(0, options.limit)
    .map((profile) => ({
      id: `sig-${profile.id.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)}`,
      platform: "nostr",
      sourceUrl: npubUrl(profile),
      publicName: profile.label,
      excerpt: excerpt(profile),
      postedAt: options.postedAt,
      locationHint: (profile.locationHints ?? [])[0] ?? "unknown",
      topics: (profile.topics ?? []).length ? profile.topics : ["bitcoin", "developer tools"],
      profileRefs: [profile.id],
      conferenceRefs: profile.conferenceRefs ?? [],
      dataMode: "real_public",
      sourceLane: options.sourceLane,
      provenanceNote: "reviewed public Nostr kind-3 follow graph",
      visibility: "public"
    }));
}

export function trustGraphSliceForSignals(graph: TrustGraph, signals: PublicSignal[]): TrustGraph {
  const profiles = new Map(graph.profiles.map((profile) => [profile.id, profile]));
  const publishedProfileIds = new Set(signals.flatMap((signal) => signal.profileRefs ?? []));
  const seedIds = new Set(graph.profiles.filter((profile) => profile.trustSeed).map((profile) => profile.id));
  const keepIds = new Set<string>([...publishedProfileIds, ...seedIds]);

  for (const profileId of publishedProfileIds) {
    const profile = profiles.get(profileId);
    if (!profile) continue;

    const linkedIds = new Set([...(profile.follows ?? []), ...(profile.followedBy ?? [])]);
    const seedAdjacentIds: string[] = [];
    for (const linkedId of linkedIds) {
      const linked = profiles.get(linkedId);
      const linksSeed = seedIds.has(linkedId) ||
        (linked?.follows ?? []).some((id) => seedIds.has(id)) ||
        (linked?.followedBy ?? []).some((id) => seedIds.has(id));
      if (seedIds.has(linkedId)) keepIds.add(linkedId);
      if (linksSeed && !seedIds.has(linkedId)) seedAdjacentIds.push(linkedId);
    }

    for (const seedId of seedIds) {
      const seed = profiles.get(seedId);
      const directlyLinked = (seed?.follows ?? []).includes(profileId) ||
        (seed?.followedBy ?? []).includes(profileId) ||
        (profile.follows ?? []).includes(seedId) ||
        (profile.followedBy ?? []).includes(seedId);
      if (directlyLinked) keepIds.add(seedId);
    }

    for (const linkedId of [...new Set(seedAdjacentIds)].sort().slice(0, 3)) {
      keepIds.add(linkedId);
    }
  }

  const trimLinks = (links: string[] | undefined) => (links ?? []).filter((id) => keepIds.has(id));
  const profilesOut = [...keepIds]
    .map((id) => profiles.get(id))
    .filter((profile): profile is TrustProfile => Boolean(profile))
    .map((profile) => ({
      ...profile,
      follows: trimLinks(profile.follows),
      followedBy: trimLinks(profile.followedBy)
    }))
    .sort((a, b) => Number(b.trustSeed) - Number(a.trustSeed) || a.id.localeCompare(b.id));

  const conferenceIds = new Set([
    ...signals.flatMap((signal) => signal.conferenceRefs ?? []),
    ...profilesOut.flatMap((profile) => profile.conferenceRefs ?? [])
  ]);

  return {
    profiles: profilesOut,
    conferences: graph.conferences.filter((conference) => conferenceIds.has(conference.id))
  };
}
