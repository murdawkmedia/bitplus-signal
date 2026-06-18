import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PublicSignalSchema } from "../src/types.js";

describe("Toronto community context seed data", () => {
  it("keeps public community rows outside the existing pulled window", () => {
    const rows = JSON.parse(fs.readFileSync("data/reviewed/toronto-community-public-signals.json", "utf8"))
      .map((row: unknown) => PublicSignalSchema.parse(row));

    expect(rows.map((row) => row.publicName)).toEqual(expect.arrayContaining([
      "The Bitcoin Bay",
      "Toronto Bitcoin Meetups",
      "DeFi Toronto"
    ]));
    expect(rows.every((row) => row.sourceLane === "community_context")).toBe(true);
    expect(rows.every((row) => new Date(row.postedAt) < new Date("2026-04-18T00:00:00.000Z"))).toBe(true);
    expect(rows.every((row) => row.visibility === "public")).toBe(true);
  });
});
