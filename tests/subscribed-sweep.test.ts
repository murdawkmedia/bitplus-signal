import fs from "node:fs";
import { describe, expect, it } from "vitest";

const inputFiles = [
  ["data/sources/apify-xquik-subscribed-sweep-input.example.json", 300],
  ["data/sources/apify-reddit-subscribed-sweep-input.example.json", 300],
  ["data/sources/apify-linkedin-subscribed-sweep-input.example.json", 300],
  ["data/sources/apify-instagram-subscribed-sweep-input.example.json", 150],
  ["data/sources/apify-tiktok-subscribed-sweep-input.example.json", 150],
  ["data/sources/apify-facebook-subscribed-sweep-input.example.json", 150]
] as const;

const historicalInputFiles = [
  ["data/sources/apify-xquik-historical-backfill-input.example.json", 300],
  ["data/sources/apify-reddit-historical-backfill-input.example.json", 300],
  ["data/sources/apify-linkedin-historical-backfill-input.example.json", 300],
  ["data/sources/apify-instagram-historical-backfill-input.example.json", 150],
  ["data/sources/apify-tiktok-historical-backfill-input.example.json", 150],
  ["data/sources/apify-facebook-historical-backfill-input.example.json", 150]
] as const;

function maxItemValue(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const record = value as Record<string, unknown>;
  const candidates = ["maxItems", "maxPosts", "resultsLimit", "limit", "maxResults"]
    .map((key) => Number(record[key] ?? 0))
    .filter((number) => Number.isFinite(number));
  return Math.max(0, ...candidates);
}

describe("subscribed Apify sweep config", () => {
  it("adds capped input packs for each public platform lane", () => {
    for (const [file, cap] of inputFiles) {
      const input = JSON.parse(fs.readFileSync(file, "utf8"));
      expect(maxItemValue(input)).toBeGreaterThan(0);
      expect(maxItemValue(input)).toBeLessThanOrEqual(cap);
      expect(JSON.stringify(input).toLowerCase()).toContain("toronto");
    }
  });

  it("has one command to run and review the subscribed sweep", () => {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

    expect(packageJson.scripts["scan:toronto:apify:subscribed"]).toContain("scan:toronto:apify:x-subscribed");
    expect(packageJson.scripts["review:social-subscribed"]).toContain("review-social");
    expect(packageJson.scripts["refresh:subscribed"]).toContain("review:social-subscribed");
  });

  it("adds older backfill input packs that skip the current reviewed window at review time", () => {
    for (const [file, cap] of historicalInputFiles) {
      const input = JSON.parse(fs.readFileSync(file, "utf8"));
      expect(maxItemValue(input)).toBeGreaterThan(0);
      expect(maxItemValue(input)).toBeLessThanOrEqual(cap);
      expect(JSON.stringify(input).toLowerCase()).toContain("toronto");
    }

    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(packageJson.scripts["review:social-historical"]).toContain("--exclude-start-date 2026-04-18");
    expect(packageJson.scripts["review:social-historical"]).toContain("--exclude-end-date 2026-06-17");
    expect(packageJson.scripts["refresh:historical"]).toContain("review:social-historical");
  });
});
