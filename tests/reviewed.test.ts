import { describe, expect, it } from "vitest";
import { signalsFromTrustGraph, trustGraphSliceForSignals } from "../src/reviewed.js";
import { TrustGraph } from "../src/types.js";

const seedHex = "4488b678a4504bc2377e9f89533e271a037f9ce20cb0362b4dd39e12fba53889";
const candidateHex = "ba690466f23faa3891570c0a38e81d0a9f84a7bcc79672d19d1abb2fc11156f0";

describe("reviewed real-data publishing", () => {
  it("turns public Nostr graph profiles into reviewed real public signal rows", () => {
    const graph: TrustGraph = {
      profiles: [
        {
          id: `nostr:${seedHex}`,
          label: "BTC++ Toronto seed",
          platform: "nostr",
          trustSeed: true,
          follows: [`nostr:${candidateHex}`]
        },
        {
          id: `nostr:${candidateHex}`,
          label: "nostr candidate",
          platform: "nostr",
          followedBy: [`nostr:${seedHex}`],
          topics: ["bitcoin", "protocol"]
        }
      ],
      conferences: []
    };

    const rows = signalsFromTrustGraph(graph, {
      limit: 1,
      sourceLane: "nostr_graph",
      postedAt: "2026-06-17"
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      platform: "nostr",
      publicName: "nostr candidate",
      visibility: "public",
      dataMode: "real_public",
      sourceLane: "nostr_graph",
      provenanceNote: "reviewed public Nostr kind-3 follow graph"
    });
    expect(rows[0].sourceUrl).toMatch(/^https:\/\/njump\.me\/npub/);
    expect(rows[0].excerpt).toContain("public Nostr trust graph");
    expect(rows[0].profileRefs).toEqual([`nostr:${candidateHex}`]);
  });

  it("keeps a reviewed trust-graph slice for published public rows", () => {
    const candidateId = `nostr:${candidateHex}`;
    const seedId = `nostr:${seedHex}`;
    const graph: TrustGraph = {
      profiles: [
        {
          id: seedId,
          label: "BTC++ Toronto seed",
          platform: "nostr",
          trustSeed: true,
          follows: [candidateId, "nostr:ignored"]
        },
        {
          id: candidateId,
          label: "nostr candidate",
          platform: "nostr",
          followedBy: [seedId, "nostr:ignored"],
          follows: ["nostr:ignored"],
          topics: ["bitcoin"]
        },
        {
          id: "nostr:ignored",
          label: "ignored",
          platform: "nostr"
        }
      ],
      conferences: []
    };

    const slice = trustGraphSliceForSignals(graph, [{
      platform: "nostr",
      sourceUrl: "https://njump.me/example",
      publicName: "nostr candidate",
      excerpt: "reviewed row",
      postedAt: "2026-06-17",
      locationHint: "unknown",
      topics: ["bitcoin"],
      profileRefs: [candidateId],
      conferenceRefs: [],
      dataMode: "real_public",
      sourceLane: "nostr_graph",
      provenanceNote: "reviewed public Nostr kind-3 follow graph",
      visibility: "public"
    }]);

    expect(slice.profiles.map((profile) => profile.id).sort()).toEqual([candidateId, seedId].sort());
    expect(slice.profiles.find((profile) => profile.id === candidateId)?.followedBy).toEqual([seedId]);
    expect(slice.profiles.find((profile) => profile.id === seedId)?.follows).toEqual([candidateId]);
  });

  it("caps seed-adjacent connectors in a reviewed trust-graph slice", () => {
    const candidateId = "nostr:candidate";
    const seedId = "nostr:seed";
    const connectorIds = ["nostr:a", "nostr:b", "nostr:c", "nostr:d"];
    const graph: TrustGraph = {
      profiles: [
        { id: seedId, label: "BTC++ seed", platform: "nostr", trustSeed: true },
        {
          id: candidateId,
          label: "candidate",
          platform: "nostr",
          followedBy: connectorIds
        },
        ...connectorIds.map((id) => ({
          id,
          label: id,
          platform: "nostr",
          follows: [seedId]
        }))
      ],
      conferences: []
    };

    const slice = trustGraphSliceForSignals(graph, [{
      platform: "nostr",
      sourceUrl: "https://njump.me/example",
      publicName: "candidate",
      excerpt: "reviewed row",
      postedAt: "2026-06-17",
      locationHint: "unknown",
      topics: ["bitcoin"],
      profileRefs: [candidateId],
      conferenceRefs: [],
      dataMode: "real_public",
      sourceLane: "nostr_graph",
      provenanceNote: "reviewed public Nostr kind-3 follow graph",
      visibility: "public"
    }]);

    const keptConnectors = slice.profiles.filter((profile) => connectorIds.includes(profile.id));
    expect(keptConnectors).toHaveLength(3);
  });
});
