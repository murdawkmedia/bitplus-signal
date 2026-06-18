import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("three minute pitch guide", () => {
  it("documents a timed judge demo script", () => {
    const text = fs.readFileSync("docs/PITCH-3MIN.md", "utf8");

    expect(text).toContain("0:00");
    expect(text).toContain("3:00");
    expect(text).toContain("Problem");
    expect(text).toContain("Demo");
    expect(text).toContain("Safety");
    expect(text).toContain("Ask");
  });
});
