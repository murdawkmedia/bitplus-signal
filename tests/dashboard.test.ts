import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("public dashboard organizer filters", () => {
  it("defaults to judge-friendly opportunity cards before advanced filters", () => {
    const html = fs.readFileSync("public/index.html", "utf8");
    const app = fs.readFileSync("public/app.js", "utf8");

    expect(html).toContain('id="topOpportunityCards"');
    expect(html).toContain('id="demoScriptPanel"');
    expect(html).toContain("<details");
    expect(html).toContain('id="advancedFilters"');
    expect(app).toContain("topOpportunities");
    expect(app).toContain("renderOpportunityCards");
    expect(app).toContain("qualityClass");
  });

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

  it("surfaces source coverage for attempted blocked and zero-yield lanes", () => {
    const html = fs.readFileSync("public/index.html", "utf8");
    const app = fs.readFileSync("public/app.js", "utf8");

    expect(html).toContain('id="sourceCoveragePanel"');
    expect(app).toContain("renderSourceCoveragePanel");
    expect(app).toContain("sourceCoverageRows");
    expect(app).toContain("statusLabel");
    expect(app).toContain("blocked_low_target_quality");
    expect(app).toContain("blocked_missing_apify_token");
    expect(app).toContain("zero_yield");
  });
});
