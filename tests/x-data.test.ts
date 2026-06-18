import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PublicSignalSchema } from "../src/types.js";

describe("reviewed X public signal rows", () => {
  it("keeps the reviewed Xquik BTC++ rows in the published input dataset", () => {
    const rows = JSON.parse(fs.readFileSync("data/reviewed/toronto-real-signals.json", "utf8"))
      .map((row: unknown) => PublicSignalSchema.parse(row));
    const xRows = rows.filter((row) => row.platform === "x" && row.sourceLane === "apify_x");

    expect(xRows.map((row) => row.id)).toEqual(expect.arrayContaining([
      "2066605743495619001",
      "2066597742151860604",
      "2065107647683072215"
    ]));
    expect(xRows.every((row) => row.visibility === "public")).toBe(true);
    expect(xRows.every((row) => row.dataMode === "real_public")).toBe(true);
    expect(xRows.every((row) => row.sourceUrl.startsWith("https://x.com/"))).toBe(true);
  });
});
