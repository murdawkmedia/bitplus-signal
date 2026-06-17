import { describe, expect, it } from "vitest";
import { buildMatches, gateSignal, scoreSignalForEvent, travelMatch } from "../src/scoring.js";
import { ConferenceEvent, PublicSignal, TrustGraph } from "../src/types.js";

const toronto: ConferenceEvent = {
  id: "toronto",
  series: "BTC++",
  name: "BTC++ Toronto",
  edition: "consensus",
  city: "Toronto",
  country: "Canada",
  region: "north_america",
  venue: "The Great Hall",
  startDate: "2026-07-22",
  endDate: "2026-07-24",
  url: "https://btcplusplus.dev/conf/toronto",
  tags: ["bitcoin", "consensus", "protocol"],
  airports: ["YYZ"],
  directFlightFrom: ["edmonton", "new york"]
};

function signal(overrides: Partial<PublicSignal>): PublicSignal {
  return {
    id: "sig-test",
    platform: "reddit",
    sourceUrl: "https://example.com/public-thread",
    publicName: "public dev",
    excerpt: "Looking for a Bitcoin protocol and consensus workshop in Canada.",
    postedAt: new Date().toISOString().slice(0, 10),
    locationHint: "Toronto",
    topics: ["bitcoin", "consensus"],
    visibility: "public",
    ...overrides
  };
}

describe("scoring", () => {
  it("scores local travel higher than direct seeded travel", () => {
    const local = scoreSignalForEvent(signal({ locationHint: "Toronto" }), toronto);
    const direct = scoreSignalForEvent(signal({ locationHint: "Edmonton" }), toronto);
    expect(travelMatch(signal({ locationHint: "Toronto" }), toronto)).toBe("local");
    expect(travelMatch(signal({ locationHint: "Edmonton" }), toronto)).toBe("direct_flight_seed");
    expect(local.score).toBeGreaterThan(direct.score);
  });

  it("blocks private and DM rows from draft generation", () => {
    const blocked = scoreSignalForEvent(signal({ visibility: "dm" }), toronto);
    expect(gateSignal(signal({ visibility: "dm" }))).toBe("blocked_private");
    expect(blocked.score).toBe(0);
    expect(blocked.draftPublicReply).toBe("");
    expect(blocked.reachPath).toBe("");
  });

  it("keeps top two event matches per signal", () => {
    const events = [toronto, { ...toronto, id: "toronto-2", name: "Second Toronto" }];
    const rows = buildMatches(events, [signal({})]);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.signalId === "sig-test")).toBe(true);
  });

  it("adds explainable trust proximity for profiles near BTC++ seeds", () => {
    const graph: TrustGraph = {
      profiles: [
        { id: "nostr:btcplusplus", label: "BTC++", platform: "nostr", trustSeed: true },
        {
          id: "nostr:toronto-dev",
          label: "Toronto protocol dev",
          platform: "nostr",
          follows: ["nostr:btcplusplus"],
          conferenceRefs: ["btc-prague"]
        }
      ],
      conferences: [
        { id: "btc-prague", name: "BTC Prague", city: "Prague", topics: ["bitcoin", "developer"] }
      ]
    };

    const trusted = scoreSignalForEvent(
      signal({ profileRefs: ["nostr:toronto-dev"], conferenceRefs: ["btc-prague"] }),
      toronto,
      graph
    );
    const untrusted = scoreSignalForEvent(signal({ profileRefs: ["nostr:unknown"] }), toronto, graph);

    expect(trusted.trustScore).toBeGreaterThan(0);
    expect(trusted.conferenceAffinityScore).toBeGreaterThan(0);
    expect(trusted.score).toBeGreaterThan(untrusted.score);
    expect(trusted.trustReasons.join(" ")).toContain("BTC++");
    expect(trusted.trustReasons.join(" ")).toContain("BTC Prague");
  });

  it("counts public follower paths through seed-adjacent profiles", () => {
    const graph: TrustGraph = {
      profiles: [
        { id: "nostr:btcplusplus", label: "BTC++", platform: "nostr", trustSeed: true },
        {
          id: "nostr:seed-adjacent",
          label: "Seed adjacent dev",
          platform: "nostr",
          follows: ["nostr:btcplusplus"]
        },
        {
          id: "nostr:candidate",
          label: "Candidate",
          platform: "nostr",
          followedBy: ["nostr:seed-adjacent"]
        }
      ],
      conferences: []
    };

    const trusted = scoreSignalForEvent(
      signal({ profileRefs: ["nostr:candidate"] }),
      toronto,
      graph
    );

    expect(trusted.trustScore).toBeGreaterThan(0);
    expect(trusted.trustReasons.join(" ")).toContain("Seed adjacent dev");
  });
});
