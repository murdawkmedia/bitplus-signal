import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildStaticData } from "../src/build.js";
import { SignalMatch } from "../src/types.js";

describe("static build", () => {
  it("can scope generated data to the Toronto BTC++ target", async () => {
    const outDir = path.join(os.tmpdir(), `bitplus-signal-build-${Date.now()}`);

    const meta = await buildStaticData({
      eventsFile: "data/events/btcplusplus-2026.json",
      signalsFile: "data/samples/signals.json",
      outDir,
      eventId: "btcpp-toronto-2026"
    });

    const events = JSON.parse(await fs.readFile(path.join(outDir, "events.json"), "utf8")) as Array<{ id: string }>;
    const matches = JSON.parse(await fs.readFile(path.join(outDir, "signals.json"), "utf8")) as SignalMatch[];

    expect(meta.eventCount).toBe(1);
    expect(events.map((event) => event.id)).toEqual(["btcpp-toronto-2026"]);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.eventId === "btcpp-toronto-2026")).toBe(true);
  });

  it("can enrich generated rows with a trust graph file", async () => {
    const outDir = path.join(os.tmpdir(), `bitplus-signal-trust-${Date.now()}`);

    const meta = await buildStaticData({
      eventsFile: "data/events/btcplusplus-2026.json",
      signalsFile: "data/samples/toronto-signals.json",
      outDir,
      eventId: "btcpp-toronto-2026",
      trustGraphFile: "data/trust/toronto-trust-seeds.json"
    });

    const matches = JSON.parse(await fs.readFile(path.join(outDir, "signals.json"), "utf8")) as SignalMatch[];

    expect(meta.matchCount).toBeGreaterThan(0);
    expect(matches.some((match) => match.trustScore > 0)).toBe(true);
    expect(matches.some((match) => match.conferenceAffinityScore > 0)).toBe(true);
  });
});
