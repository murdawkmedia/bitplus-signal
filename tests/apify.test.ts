import { describe, expect, it } from "vitest";
import { apifyActorPath, normalizeApifyItems } from "../src/apify.js";

describe("apify imports", () => {
  it("converts store-style actor IDs to API paths", () => {
    expect(apifyActorPath("apify/twitter-scraper")).toBe("apify~twitter-scraper");
    expect(apifyActorPath("apify~twitter-scraper")).toBe("apify~twitter-scraper");
  });

  it("normalizes common actor output into public signals", () => {
    const rows = normalizeApifyItems([
      {
        url: "https://example.com/post/1",
        text: "Toronto Bitcoin protocol conference?",
        author: "@builder",
        createdAt: "2026-06-17",
        source: "x",
        city: "Toronto",
        tags: ["bitcoin", "protocol"],
        profile_ref: "x:builder",
        conference_ref: "btc-prague"
      }
    ]);

    expect(rows[0]).toMatchObject({
      platform: "x",
      sourceUrl: "https://example.com/post/1",
      publicName: "@builder",
      visibility: "public",
      profileRefs: ["x:builder"],
      conferenceRefs: ["btc-prague"]
    });
  });

  it("skips actor no-results placeholders", () => {
    const rows = normalizeApifyItems([
      { noResults: true },
      {
        url: "https://example.com/post/1",
        text: "Toronto Bitcoin protocol conference?",
        author: "@builder",
        createdAt: "2026-06-17"
      }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].sourceUrl).toBe("https://example.com/post/1");
  });

  it("normalizes Reddit actor posts into reviewed public source-lane rows", () => {
    const rows = normalizeApifyItems([
      {
        type: "post",
        id: "abc123",
        title: "Bitcoin Core meetup in Toronto?",
        author: "public_redditor",
        subreddit: "Bitcoin",
        createdAt: "2026-06-17T10:22:00.000Z",
        url: "https://www.reddit.com/r/Bitcoin/comments/abc123/example/",
        selfText: "Looking for protocol people around Toronto.",
        isNSFW: false
      }
    ]);

    expect(rows[0]).toMatchObject({
      platform: "reddit",
      sourceUrl: "https://www.reddit.com/r/Bitcoin/comments/abc123/example/",
      publicName: "u/public_redditor",
      excerpt: "Bitcoin Core meetup in Toronto? Looking for protocol people around Toronto.",
      dataMode: "real_public",
      sourceLane: "apify_reddit",
      provenanceNote: "reviewed public Apify Reddit scraper output",
      visibility: "public"
    });
  });

  it("normalizes Xquik actor tweets into reviewed public source-lane rows", () => {
    const rows = normalizeApifyItems([
      {
        id: "2066605743495619001",
        text: "tickets -&gt; https://btcpp.dev",
        createdAt: "Tue Jun 16 15:44:00 +0000 2026",
        url: "https://x.com/btcplusplus/status/2066605743495619001",
        source: "<a href=\"https://mobile.twitter.com\" rel=\"nofollow\">Twitter Web App</a>",
        author: {
          userName: "btcplusplus",
          name: "bitcoin++",
          location: "Toronto"
        }
      }
    ]);

    expect(rows[0]).toMatchObject({
      platform: "x",
      sourceUrl: "https://x.com/btcplusplus/status/2066605743495619001",
      publicName: "@btcplusplus",
      excerpt: "tickets -> https://btcpp.dev",
      locationHint: "Toronto",
      dataMode: "real_public",
      sourceLane: "apify_x",
      provenanceNote: "reviewed public Apify X scraper output",
      visibility: "public"
    });
  });
});
