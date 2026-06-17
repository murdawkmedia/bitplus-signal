import { TrustGraph, TrustProfile } from "./types.js";

interface NostrFollowListEvent {
  pubkey: string;
  kind: number;
  tags: string[][];
}

interface NostrGraphScanOptions {
  seedPubkeys: string[];
  relays: string[];
  maxFollowersPerSeed: number;
  timeoutMs?: number;
}

function profile(id: string, label = id, trustSeed = false): TrustProfile {
  return {
    id,
    label,
    platform: "nostr",
    trustSeed,
    follows: [],
    followedBy: [],
    conferenceRefs: [],
    topics: [],
    locationHints: []
  };
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) values.push(value);
}

export function trustProfilesFromNostrFollowLists(events: NostrFollowListEvent[], seedPubkeys: Set<string>): TrustProfile[] {
  const profiles = new Map<string, TrustProfile>();
  for (const event of events) {
    const authorId = `nostr:${event.pubkey}`;
    const author = profiles.get(authorId) ?? profile(authorId, authorId, seedPubkeys.has(event.pubkey));
    author.trustSeed = author.trustSeed || seedPubkeys.has(event.pubkey);
    profiles.set(authorId, author);

    for (const tag of event.tags) {
      if (tag[0] !== "p" || !tag[1]) continue;
      const followedId = `nostr:${tag[1]}`;
      const followed = profiles.get(followedId) ?? profile(followedId, tag[3] || followedId, seedPubkeys.has(tag[1]));
      followed.label = tag[3] || followed.label;
      followed.trustSeed = followed.trustSeed || seedPubkeys.has(tag[1]);
      addUnique(author.follows, followedId);
      addUnique(followed.followedBy, authorId);
      profiles.set(authorId, author);
      profiles.set(followedId, followed);
    }
  }
  return [...profiles.values()];
}

export async function scanNostrTrustGraph(options: NostrGraphScanOptions): Promise<TrustGraph> {
  const { SimplePool, nip19 } = (await import("nostr-tools")) as unknown as {
    SimplePool: new () => {
      querySync: (relays: string[], filter: unknown) => Promise<NostrFollowListEvent[]>;
      close: (relays: string[]) => void;
    };
    nip19: {
      decode: (value: string) => { type: string; data: unknown };
    };
  };
  const seedPubkeys = options.seedPubkeys.map((seed) => {
    if (!seed.startsWith("npub")) return seed;
    const decoded = nip19.decode(seed);
    if (decoded.type !== "npub" || typeof decoded.data !== "string") {
      throw new Error(`Unsupported Nostr seed: ${seed}`);
    }
    return decoded.data;
  });
  const pool = new SimplePool();
  const withTimeout = async (filter: unknown): Promise<NostrFollowListEvent[]> => {
    const timeoutMs = options.timeoutMs ?? 30_000;
    return Promise.race([
      pool.querySync(options.relays, filter),
      new Promise<NostrFollowListEvent[]>((resolve) => setTimeout(() => resolve([]), timeoutMs))
    ]);
  };
  try {
    const seedFollowLists = await withTimeout({ kinds: [3], authors: seedPubkeys });
    const followerLists = await withTimeout({ kinds: [3], "#p": seedPubkeys, limit: options.maxFollowersPerSeed * seedPubkeys.length });
    return {
      profiles: trustProfilesFromNostrFollowLists([...seedFollowLists, ...followerLists], new Set(seedPubkeys)),
      conferences: []
    };
  } finally {
    pool.close(options.relays);
  }
}
