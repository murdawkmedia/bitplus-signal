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
});
