import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PublicSignalSchema } from "../src/types.js";

describe("conference window crossover seed data", () => {
  it("includes same-week Toronto crossover event pages as reviewed public rows", () => {
    const rows = JSON.parse(fs.readFileSync("data/reviewed/toronto-adjacent-event-signals.json", "utf8"))
      .map((row: unknown) => PublicSignalSchema.parse(row));
    const crossoverRows = rows.filter((row) => row.sourceLane === "conference_window_crossover");

    expect(crossoverRows.map((row) => row.publicName)).toEqual(expect.arrayContaining([
      "Canada Crypto Week",
      "AI Futurist Conference"
    ]));
    expect(crossoverRows.every((row) => row.postedAt === "2026-06-17")).toBe(true);
    expect(crossoverRows.every((row) => row.visibility === "public")).toBe(true);
    expect(crossoverRows.every((row) => row.conferenceRefs.some((ref) => ref.startsWith("adjacent:")))).toBe(true);
  });
});
