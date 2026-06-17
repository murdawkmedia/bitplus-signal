import { describe, expect, it } from "vitest";
import { buildMatches, gateSignal, scoreSignalForEvent, travelMatch } from "../src/scoring.js";
import { ConferenceEvent, PublicSignal } from "../src/types.js";

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
});

