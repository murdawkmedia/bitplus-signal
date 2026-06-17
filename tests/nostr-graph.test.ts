import { describe, expect, it } from "vitest";
import { trustProfilesFromNostrFollowLists } from "../src/nostrGraph.js";

describe("nostr trust graph imports", () => {
  it("turns kind 3 follow lists into trust profiles", () => {
    const profiles = trustProfilesFromNostrFollowLists([
      {
        pubkey: "seedpubkey",
        kind: 3,
        tags: [
          ["p", "followedpubkey", "wss://relay.example", "Protocol Dev"],
          ["p", "anotherpubkey"]
        ]
      }
    ], new Set(["seedpubkey"]));

    expect(profiles).toEqual([
      {
        id: "nostr:seedpubkey",
        label: "nostr:seedpubkey",
        platform: "nostr",
        trustSeed: true,
        follows: ["nostr:followedpubkey", "nostr:anotherpubkey"],
        followedBy: [],
        conferenceRefs: [],
        topics: [],
        locationHints: []
      },
      {
        id: "nostr:followedpubkey",
        label: "Protocol Dev",
        platform: "nostr",
        trustSeed: false,
        follows: [],
        followedBy: ["nostr:seedpubkey"],
        conferenceRefs: [],
        topics: [],
        locationHints: []
      },
      {
        id: "nostr:anotherpubkey",
        label: "nostr:anotherpubkey",
        platform: "nostr",
        trustSeed: false,
        follows: [],
        followedBy: ["nostr:seedpubkey"],
        conferenceRefs: [],
        topics: [],
        locationHints: []
      }
    ]);
  });
});
