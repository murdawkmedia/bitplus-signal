import { describe, expect, it } from "vitest";
import { buildMatches, classifyGeoAudience, gateSignal, scoreSignalForEvent, travelMatch } from "../src/scoring.js";
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
  directFlightFrom: ["edmonton", "new york", "san francisco"]
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

  it("classifies Toronto-area and near-direct cities for broad organizer targeting", () => {
    const waterloo = classifyGeoAudience(signal({ locationHint: "Kitchener-Waterloo" }), toronto);
    const boston = classifyGeoAudience(signal({ locationHint: "Boston, MA" }), toronto);

    expect(waterloo.geoTier).toBe("local_area");
    expect(waterloo.audienceScope).toBe("broad_builder_crypto");
    expect(waterloo.topicPolicy).toBe("broad_allowed");
    expect(boston.geoTier).toBe("near_direct_3h");
    expect(boston.audienceScope).toBe("broad_builder_crypto");
  });

  it("classifies long-haul, alias, and unknown rows as bitcoin-only targeting", () => {
    const austin = classifyGeoAudience(signal({ locationHint: "ATX" }), toronto);
    const vancouver = classifyGeoAudience(signal({ locationHint: "Vancouver" }), toronto);
    const unknown = classifyGeoAudience(signal({ locationHint: "🌎🌏🌍" }), toronto);

    expect(austin).toMatchObject({
      normalizedLocation: "austin",
      geoTier: "long_direct_or_far",
      audienceScope: "bitcoin_only"
    });
    expect(vancouver.geoTier).toBe("long_direct_or_far");
    expect(vancouver.audienceScope).toBe("bitcoin_only");
    expect(unknown.geoTier).toBe("unknown_location");
    expect(unknown.audienceScope).toBe("bitcoin_only");
    expect(unknown.topicPolicy).toBe("needs_location_review");
  });

  it("adds geo and audience policy to generated matches", () => {
    const row = scoreSignalForEvent(signal({
      locationHint: "San Francisco",
      excerpt: "Bitcoin Core policy and consensus review notes.",
      topics: ["bitcoin", "consensus"]
    }), toronto);

    expect(row.geoTier).toBe("long_direct_or_far");
    expect(row.audienceScope).toBe("bitcoin_only");
    expect(row.geoReason).toContain("longer");
    expect(row.scoreBreakdown).toContain("G");
  });

  it("blocks private and DM rows from draft generation", () => {
    const blocked = scoreSignalForEvent(signal({ visibility: "dm" }), toronto);
    expect(gateSignal(signal({ visibility: "dm" }))).toBe("blocked_private");
    expect(blocked.score).toBe(0);
    expect(blocked.draftPublicReply).toBe("");
    expect(blocked.reachPath).toBe("");
  });

  it("writes tailored BTC++ public comments without direct event links", () => {
    const stablecoin = scoreSignalForEvent(signal({
      platform: "linkedin",
      publicName: "Ali",
      excerpt: "Toronto Tech Week panel on stablecoins, CBDCs, privacy, and who answers when payments break.",
      topics: ["privacy", "developer tools"],
      sourceUrl: "https://www.linkedin.com/posts/example"
    }), toronto);
    const hackathon = scoreSignalForEvent(signal({
      publicName: "Waterloo builders",
      excerpt: "Waterloo hackathon teams shipped open-source AI and developer tools all weekend.",
      topics: ["hackathon", "open source"],
      sourceUrl: "https://example.com/hackathon"
    }), toronto);

    expect(stablecoin.draftPublicReply).toContain("stablecoins");
    expect(stablecoin.draftPublicReply).toContain("privacy");
    expect(hackathon.draftPublicReply).toContain("hackathon");
    expect(hackathon.draftPublicReply).toContain("builders");
    expect(stablecoin.draftPublicReply).not.toBe(hackathon.draftPublicReply);
    for (const draft of [stablecoin.draftPublicReply, hackathon.draftPublicReply]) {
      expect(draft).toContain("BTC++");
      expect(draft).not.toContain("Public draft");
      expect(draft).not.toContain("Details:");
      expect(draft).not.toContain("http");
    }
  });

  it("uses a softer trust-graph draft for Nostr profile signals", () => {
    const nostr = scoreSignalForEvent(signal({
      platform: "nostr",
      publicName: "nostr:abc",
      excerpt: "Public Nostr note about trust graph overlap near Bitcoin builders and BTC++ Toronto seeds.",
      topics: ["bitcoin", "developer tools"],
      profileRefs: ["nostr:abc"],
      sourceLane: "nostr_notes"
    }), toronto);

    expect(nostr.draftPublicReply).toContain("Nostr");
    expect(nostr.draftPublicReply).toContain("overlap");
    expect(nostr.draftPublicReply).not.toContain("http");
    expect(nostr.draftPublicReply).not.toContain("Details:");
  });

  it("demotes graph-only Nostr profiles to non-draft trust candidates", () => {
    const graphOnly = scoreSignalForEvent(signal({
      platform: "nostr",
      publicName: "nostr:abc",
      excerpt: "Reviewed real public-data candidate from the public Nostr trust graph near BTC++ Toronto seeds. Public graph evidence: followed by 4 seed-adjacent profile(s), follows 900 public profile(s).",
      topics: ["bitcoin", "developer tools"],
      profileRefs: ["nostr:abc"],
      conferenceRefs: [],
      sourceLane: "nostr_graph"
    }), toronto);

    expect(graphOnly.evidenceLevel).toBe("trust_candidate");
    expect(graphOnly.draftPublicReply).toBe("");
    expect(graphOnly.score).toBeLessThan(55);
    expect(graphOnly.scoreBreakdown).toContain("Q");
  });

  it("marks same-week crossover conference pages as event evidence", () => {
    const crossover = scoreSignalForEvent(signal({
      id: "sig-crossover-canada-crypto-week",
      platform: "official_web",
      publicName: "Canada Crypto Week",
      sourceUrl: "https://www.canadacryptoweek.com/",
      sourceLane: "conference_window_crossover",
      excerpt: "Canada Crypto Week runs July 20-26, 2026 in Toronto with Web3, AI, side events, sponsors, and community partners.",
      postedAt: "2026-06-17",
      locationHint: "Toronto",
      topics: ["crypto", "AI", "Web3", "developer tools"],
      conferenceRefs: ["adjacent:canada-crypto-week"]
    }), toronto);

    expect(crossover.evidenceLevel).toBe("crossover_event_page");
    expect(crossover.geoTier).toBe("local_area");
    expect(crossover.draftPublicReply).toContain("Canada Crypto Week");
  });

  it("keeps drafts distinct for similar public rows", () => {
    const ndc = scoreSignalForEvent(signal({
      id: "sig-ndc",
      platform: "official_web",
      publicName: "NDC Toronto",
      sourceLane: "adjacent_event_official",
      excerpt: "NDC Toronto software developers talked security, AI, architecture, and tooling.",
      topics: ["security", "AI", "developer tools"]
    }), toronto);
    const waterloo = scoreSignalForEvent(signal({
      id: "sig-waterloo",
      platform: "official_web",
      publicName: "Waterloo Tech Week",
      sourceLane: "adjacent_event_official",
      excerpt: "Waterloo Tech Week celebrates Waterloo innovation, tech talent, and builder community.",
      topics: ["open source", "AI", "builder"]
    }), toronto);
    const nostrA = scoreSignalForEvent(signal({
      id: "sig-nostr-a",
      platform: "nostr",
      publicName: "nostr:a",
      sourceLane: "nostr_graph",
      excerpt: "Reviewed real public-data candidate from the public Nostr trust graph near BTC++ Toronto seeds.",
      topics: ["bitcoin", "developer tools"]
    }), toronto);
    const nostrB = scoreSignalForEvent(signal({
      id: "sig-nostr-b",
      platform: "nostr",
      publicName: "nostr:b",
      sourceLane: "nostr_graph",
      excerpt: "Reviewed real public-data candidate from the public Nostr trust graph near BTC++ Toronto seeds.",
      topics: ["bitcoin", "developer tools"]
    }), toronto);

    expect(ndc.draftPublicReply).toContain("NDC Toronto");
    expect(waterloo.draftPublicReply).toContain("Waterloo Tech Week");
    expect(ndc.draftPublicReply).not.toBe(waterloo.draftPublicReply);
    expect(nostrA.evidenceLevel).toBe("trust_candidate");
    expect(nostrB.evidenceLevel).toBe("trust_candidate");
    expect(nostrA.draftPublicReply).toBe("");
    expect(nostrB.draftPublicReply).toBe("");
  });

  it("varies direct BTC++ mention drafts by post content", () => {
    const ticket = scoreSignalForEvent(signal({
      platform: "x",
      publicName: "@niftynei",
      excerpt: "@btcplusplus tickets -> https://t.co/example",
      topics: ["BTC++ Toronto", "bitcoin"],
      conferenceRefs: ["btcpp-toronto-2026"]
    }), toronto);
    const presentation = scoreSignalForEvent(signal({
      platform: "x",
      publicName: "@conduition_io",
      excerpt: "had this left over from a presentation i'm working on for @btcplusplus Toronto",
      topics: ["BTC++ Toronto", "developer tools"],
      conferenceRefs: ["btcpp-toronto-2026"]
    }), toronto);

    expect(ticket.draftPublicReply).toContain("ticket");
    expect(presentation.draftPublicReply).toContain("presentation");
    expect(ticket.draftPublicReply).not.toBe(presentation.draftPublicReply);
    expect(ticket.draftPublicReply).not.toContain("http");
    expect(presentation.draftPublicReply).not.toContain("http");
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
