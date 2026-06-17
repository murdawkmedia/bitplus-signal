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
});
