import { describe, expect, it } from "vitest";
import { reviewSocialSignals } from "../src/socialReview.js";
import { PublicSignal } from "../src/types.js";

function signal(overrides: Partial<PublicSignal>): PublicSignal {
  return {
    id: "sig-test",
    platform: "linkedin",
    sourceUrl: "https://example.com/post",
    publicName: "public builder",
    excerpt: "Toronto Tech Week hackathon for Ethereum, privacy, and open source AI builders.",
    postedAt: "2026-05-28T12:00:00.000Z",
    locationHint: "Toronto",
    topics: ["hackathon", "ethereum", "privacy", "developer tools"],
    profileRefs: [],
    conferenceRefs: [],
    dataMode: "real_public",
    sourceLane: "apify_linkedin",
    provenanceNote: "test",
    visibility: "public",
    ...overrides
  };
}

describe("social review gate", () => {
  it("publishes high-fit public rows in the 30-day window", () => {
    const result = reviewSocialSignals([signal({})], { fallbackThreshold: 1 });

    expect(result.usedWindowDays).toBe(30);
    expect(result.published).toHaveLength(1);
    expect(result.published[0].conferenceRefs).toContain("adjacent:toronto-tech-week");
    expect(result.published[0].topics).toContain("freedom-tech-adjacent");
  });

  it("falls back to 60 days when the 30-day window is thin", () => {
    const result = reviewSocialSignals([
      signal({
        sourceUrl: "https://example.com/older",
        postedAt: "2026-05-07T12:00:00.000Z",
        excerpt: "NDC Toronto software developers talked open source, security, and AI."
      })
    ]);

    expect(result.usedWindowDays).toBe(60);
    expect(result.published).toHaveLength(1);
    expect(result.published[0].conferenceRefs).toContain("adjacent:ndc-toronto");
  });

  it("treats regional cities within five hours as near-local", () => {
    const result = reviewSocialSignals([
      signal({
        sourceUrl: "https://example.com/waterloo",
        locationHint: "Waterloo",
        excerpt: "Waterloo hackathon builders shipping zk and Web3 developer tools."
      })
    ]);

    expect(result.published).toHaveLength(1);
    expect(result.published[0].locationHint).toBe("Waterloo");
  });

  it("blocks far broad-builder rows unless they are bitcoin or freedom-tech specific", () => {
    const result = reviewSocialSignals([
      signal({
        sourceUrl: "https://example.com/vancouver-broad",
        locationHint: "Vancouver",
        excerpt: "Toronto Tech Week hackathon recap for Web3, AI, and developer tooling.",
        topics: ["hackathon", "web3", "open source", "developer tools"]
      })
    ]);

    expect(result.published).toHaveLength(0);
    expect(result.blocked[0]).toMatchObject({ reason: "far_scope_requires_bitcoin" });
  });

  it("keeps far bitcoin and protocol rows eligible for bitcoin-only targeting", () => {
    const result = reviewSocialSignals([
      signal({
        sourceUrl: "https://example.com/vancouver-bitcoin",
        locationHint: "Vancouver",
        excerpt: "Bitcoin Core policy review group comparing consensus tradeoffs and self custody tooling.",
        topics: ["bitcoin", "consensus", "self custody", "developer tools"]
      })
    ]);

    expect(result.published).toHaveLength(1);
    expect(result.published[0].topics).toContain("bitcoin-only-far");
  });

  it("blocks generic trading news even when it mentions bitcoin", () => {
    const result = reviewSocialSignals([
      signal({
        sourceUrl: "https://example.com/price",
        excerpt: "Bitcoin price holds steady as traders watch ETF inflows.",
        topics: ["bitcoin", "trading"],
        locationHint: "Toronto"
      })
    ]);

    expect(result.published).toHaveLength(0);
    expect(result.blocked[0]).toMatchObject({ reason: "low_target_quality" });
  });

  it("blocks private and login-gated rows", () => {
    const result = reviewSocialSignals([
      signal({ visibility: "login_gated" })
    ]);

    expect(result.published).toHaveLength(0);
    expect(result.blocked[0]).toMatchObject({ reason: "blocked_private" });
  });

  it("dedupes by normalized source URL", () => {
    const result = reviewSocialSignals([
      signal({ sourceUrl: "https://example.com/post?utm_source=x" }),
      signal({ sourceUrl: "https://example.com/post" })
    ]);

    expect(result.published).toHaveLength(1);
    expect(result.blocked.some((row) => row.reason === "duplicate_source")).toBe(true);
  });

  it("publishes event attendance, speaker, sponsor, and host intent posts", () => {
    const result = reviewSocialSignals([
      signal({
        sourceUrl: "https://example.com/speaker",
        excerpt: "I am speaking at Canada Crypto Week in Toronto about privacy and self custody.",
        topics: ["privacy", "self custody", "speaker"],
        locationHint: "Toronto"
      }),
      signal({
        sourceUrl: "https://example.com/sponsor",
        excerpt: "Our team is sponsoring a Blockchain Futurist side event for open-source builders.",
        topics: ["open source", "builders", "sponsor"],
        locationHint: "Toronto"
      })
    ], { fallbackThreshold: 1 });

    expect(result.published).toHaveLength(2);
    expect(result.published.every((row) => row.topics.includes("public-intent"))).toBe(true);
  });

  it("blocks generic adjacent-event mentions when no public intent is present", () => {
    const result = reviewSocialSignals([
      signal({
        sourceUrl: "https://example.com/generic",
        excerpt: "Canada Crypto Week is coming to Toronto and crypto markets are watching.",
        topics: ["crypto"],
        locationHint: "Toronto"
      })
    ]);

    expect(result.published).toHaveLength(0);
    expect(result.blocked[0]).toMatchObject({ reason: "low_target_quality" });
  });
});
