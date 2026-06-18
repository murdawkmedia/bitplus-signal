import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PublicSignalSchema } from "../src/types.js";

describe("historical public backfill seed data", () => {
  it("keeps reviewed historical rows outside the existing pulled window", () => {
    const rows = JSON.parse(fs.readFileSync("data/reviewed/toronto-historical-public-signals.json", "utf8"))
      .map((row: unknown) => PublicSignalSchema.parse(row));

    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.every((row) => row.sourceLane === "historical_event_context")).toBe(true);
    expect(rows.every((row) => new Date(row.postedAt) < new Date("2026-04-18T00:00:00.000Z"))).toBe(true);
    expect(rows.every((row) => row.visibility === "public")).toBe(true);
  });
});
