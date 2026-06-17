import { normalizeSignals } from "./normalize.js";
import { PublicSignal } from "./types.js";

export interface NostrScanOptions {
  query: string;
  relays: string[];
  limit: number;
}

interface NostrEventLike {
  id: string;
  pubkey: string;
  created_at: number;
  content: string;
}

export async function scanNostr(options: NostrScanOptions): Promise<PublicSignal[]> {
  const { SimplePool } = (await import("nostr-tools")) as unknown as {
    SimplePool: new () => {
      querySync: (relays: string[], filters: unknown[]) => Promise<NostrEventLike[]>;
      close: (relays: string[]) => void;
    };
  };
  const pool = new SimplePool();
  try {
    const events = await pool.querySync(options.relays, [
      { kinds: [1], search: options.query, limit: options.limit }
    ]);
    return normalizeSignals(
      events.map((event) => ({
        platform: "nostr",
        sourceUrl: `nostr:note:${event.id}`,
        publicName: `npub:${event.pubkey.slice(0, 12)}`,
        excerpt: event.content,
        postedAt: new Date(event.created_at * 1000).toISOString().slice(0, 10),
        locationHint: "unknown",
        topics: [options.query],
        visibility: "public"
      }))
    );
  } finally {
    pool.close(options.relays);
  }
}

