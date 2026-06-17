import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readSignals } from "../src/io.js";
import { normalizeSignal } from "../src/normalize.js";

describe("normalization", () => {
  it("maps common CSV aliases into the public signal schema", async () => {
    const file = path.join(os.tmpdir(), `bitplus-signal-${Date.now()}.csv`);
    await fs.writeFile(
      file,
      [
        "source_platform,source_url_full,public_name_or_org,message_text_public_excerpt,date_of_message,intent_keywords,geo_town,channel_class",
        "reddit,https://example.com/r/1,u/example,Bitcoin privacy workshop?,2026-06-15,\"bitcoin,privacy\",Seoul,green_public_declared"
      ].join("\n"),
      "utf8"
    );
    const rows = await readSignals(file);
    expect(rows[0]).toMatchObject({
      platform: "reddit",
      sourceUrl: "https://example.com/r/1",
      publicName: "u/example",
      locationHint: "Seoul",
      visibility: "public"
    });
    expect(rows[0].topics).toContain("privacy");
  });

  it("normalizes private source hints into blocked visibility", () => {
    const row = normalizeSignal({
      platform: "facebook",
      sourceUrl: "https://example.com/private",
      excerpt: "Private message",
      privacy_review: "blocked_private"
    });
    expect(row.visibility).toBe("private");
  });
});
