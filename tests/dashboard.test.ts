import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("public dashboard organizer filters", () => {
  it("exposes checkbox filter groups for organizer slicing", () => {
    const html = fs.readFileSync("public/index.html", "utf8");

    expect(html).toContain('id="platformFilters"');
    expect(html).toContain('id="sourceLaneFilters"');
    expect(html).toContain('id="geoFilters"');
    expect(html).toContain('id="audienceFilters"');
    expect(html).toContain('id="evidenceFilters"');
    expect(html).toContain('id="topicFilters"');
    expect(html).toContain('id="includeTrustCandidates"');
  });

  it("uses multi-select state instead of single platform and travel values", () => {
    const app = fs.readFileSync("public/app.js", "utf8");

    expect(app).toContain("selectedFilters");
    expect(app).toContain("platforms: new Set()");
    expect(app).toContain("sourceLanes: new Set()");
    expect(app).toContain("geoTiers: new Set()");
    expect(app).toContain("audienceScopes: new Set()");
    expect(app).toContain("evidenceLevels: new Set()");
    expect(app).toContain("topicMatches: new Set()");
    expect(app).toContain("showTrustCandidates: false");
    expect(app).toContain('rowEvidenceLevel(row) === "trust_candidate"');
    expect(app).not.toContain("state.platform && row.platform");
    expect(app).not.toContain("state.travel && row.travelMatch");
  });
});
