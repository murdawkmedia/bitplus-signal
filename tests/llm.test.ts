import { describe, expect, it } from "vitest";
import { refineDraft } from "../src/llm.js";
import { DEFAULT_OPENROUTER_MODEL } from "../src/models.js";
import { SignalMatch } from "../src/types.js";

function match(): SignalMatch {
  return {
    matchId: "match-1",
    signalId: "sig-1",
    eventId: "btcpp-toronto-2026",
    eventName: "BTC++ Toronto",
    eventEdition: "consensus",
    eventCity: "Toronto",
    eventCountry: "Canada",
    eventDates: "2026-07-22 to 2026-07-24",
    eventUrl: "https://btcplusplus.dev/conf/toronto",
    platform: "nostr",
    sourceUrl: "https://njump.me/npub1example",
    publicName: "public profile",
    excerpt: "Public Bitcoin protocol signal.",
    postedAt: "2026-06-17",
    locationHint: "Toronto",
    topics: ["bitcoin", "protocol"],
    topicMatch: ["bitcoin", "protocol"],
    travelMatch: "local",
    gate: "public_ok",
    trustScore: 20,
    conferenceAffinityScore: 8,
    trustReasons: ["public graph proximity"],
    dataMode: "real_public",
    sourceLane: "nostr_graph",
    provenanceNote: "reviewed public Nostr kind-3 follow graph",
    score: 88,
    scoreBreakdown: "v2",
    approvalStatus: "needs_human_review",
    reachPath: "https://njump.me/npub1example",
    draftPublicReply: "Original draft."
  };
}

describe("OpenRouter drafting", () => {
  it("defaults to GLM 5.1 for the hackathon model", () => {
    expect(DEFAULT_OPENROUTER_MODEL).toBe("z-ai/glm-5.1");
  });

  it("falls back to the deterministic draft when no API key is set", async () => {
    const previous = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    await expect(refineDraft(match())).resolves.toBe("Original draft.");
    if (previous) process.env.OPENROUTER_API_KEY = previous;
  });
});
