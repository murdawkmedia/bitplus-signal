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

  it("normalizes LinkedIn public posts into reviewed public source-lane rows", () => {
    const rows = normalizeApifyItems([
      {
        postUrl: "https://www.linkedin.com/posts/example_toronto-tech-week-hackathon-activity-123",
        text: "Toronto Tech Week hackathon circuit is packed with AI, crypto, and builders.",
        authorName: "Toronto Builder",
        postedAt: "2026-05-28T12:00:00.000Z"
      }
    ]);

    expect(rows[0]).toMatchObject({
      platform: "linkedin",
      sourceUrl: "https://www.linkedin.com/posts/example_toronto-tech-week-hackathon-activity-123",
      publicName: "Toronto Builder",
      excerpt: "Toronto Tech Week hackathon circuit is packed with AI, crypto, and builders.",
      dataMode: "real_public",
      sourceLane: "apify_linkedin",
      provenanceNote: "reviewed public Apify LinkedIn scraper output",
      visibility: "public"
    });
  });

  it("repairs common public scraper mojibake in normalized text", () => {
    const rows = normalizeApifyItems([
      {
        postUrl: "https://www.linkedin.com/posts/example_mojibake-activity-123",
        text: "\u00e2\u20ac\u0153Toronto Tech Week\u00e2\u20ac\u009d builders talked privacy\u00e2\u20ac\u00a6 and open-source AI.",
        authorName: "Toronto Builder",
        postedAt: "2026-05-28T12:00:00.000Z"
      }
    ]);

    expect(rows[0].excerpt).toBe("\"Toronto Tech Week\" builders talked privacy... and open-source AI.");
  });

  it("normalizes TikTok public videos into reviewed public source-lane rows", () => {
    const rows = normalizeApifyItems([
      {
        webVideoUrl: "https://www.tiktok.com/@builder/video/123",
        text: "Toronto hackathon recap with Ethereum builders and privacy tooling.",
        createTimeISO: "2026-06-01T20:30:00.000Z",
        authorMeta: { name: "builder", nickName: "Builder" }
      }
    ]);

    expect(rows[0]).toMatchObject({
      platform: "tiktok",
      sourceUrl: "https://www.tiktok.com/@builder/video/123",
      publicName: "@builder",
      excerpt: "Toronto hackathon recap with Ethereum builders and privacy tooling.",
      dataMode: "real_public",
      sourceLane: "apify_tiktok",
      provenanceNote: "reviewed public Apify TikTok scraper output",
      visibility: "public"
    });
  });

  it("normalizes Instagram public posts into reviewed public source-lane rows", () => {
    const rows = normalizeApifyItems([
      {
        url: "https://www.instagram.com/p/example/",
        caption: "Waterloo Tech Week builders talking Web3, AI, and privacy.",
        ownerUsername: "waterlootech",
        timestamp: "2026-05-29T16:00:00.000Z"
      }
    ]);

    expect(rows[0]).toMatchObject({
      platform: "instagram",
      sourceUrl: "https://www.instagram.com/p/example/",
      publicName: "@waterlootech",
      excerpt: "Waterloo Tech Week builders talking Web3, AI, and privacy.",
      dataMode: "real_public",
      sourceLane: "apify_instagram",
      provenanceNote: "reviewed public Apify Instagram scraper output",
      visibility: "public"
    });
  });

  it("normalizes Facebook public posts into reviewed public source-lane rows", () => {
    const rows = normalizeApifyItems([
      {
        postUrl: "https://www.facebook.com/events/example/posts/123",
        message: "NDC Toronto software developers are meeting downtown this week.",
        pageName: "NDC Toronto",
        time: "2026-05-07T09:00:00.000Z"
      }
    ]);

    expect(rows[0]).toMatchObject({
      platform: "facebook",
      sourceUrl: "https://www.facebook.com/events/example/posts/123",
      publicName: "NDC Toronto",
      excerpt: "NDC Toronto software developers are meeting downtown this week.",
      dataMode: "real_public",
      sourceLane: "apify_facebook",
      provenanceNote: "reviewed public Apify Facebook scraper output",
      visibility: "public"
    });
  });
});
