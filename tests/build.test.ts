import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildStaticData } from "../src/build.js";
import { BuildMeta, SignalMatch } from "../src/types.js";

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

  it("writes source-log output and real-vs-sample metadata", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "bitplus-signal-meta-"));
    const signalsFile = path.join(tmp, "signals.json");
    const sourceLogFile = path.join(tmp, "source-log.json");
    const outDir = path.join(tmp, "out");
    await fs.writeFile(signalsFile, JSON.stringify([
      {
        platform: "nostr",
        sourceUrl: "https://njump.me/npub1real",
        publicName: "real public profile",
        excerpt: "Public Nostr trust graph candidate for BTC++ Toronto.",
        postedAt: "2026-06-17",
        locationHint: "unknown",
        topics: ["bitcoin"],
        visibility: "public",
        dataMode: "real_public",
        sourceLane: "nostr_graph",
        provenanceNote: "reviewed public Nostr kind-3 follow graph"
      },
      {
        platform: "sample",
        sourceUrl: "sample://demo",
        publicName: "sample",
        excerpt: "Synthetic sample row.",
        postedAt: "2026-06-17",
        locationHint: "Toronto",
        topics: ["bitcoin"],
        visibility: "public",
        dataMode: "sample_synthetic",
        sourceLane: "sample_fixture",
        provenanceNote: "synthetic fixture"
      }
    ]), "utf8");
    await fs.writeFile(sourceLogFile, JSON.stringify({
      lanes: [
        { sourceLane: "nostr_graph", query: "BTC++ Toronto seed graph", yielded: 1, published: 1, status: "published_reviewed" },
        { sourceLane: "nostr_notes", query: "BTC++ Toronto", yielded: 0, published: 0, status: "zero_yield" }
      ]
    }), "utf8");

    const meta = await buildStaticData({
      eventsFile: "data/events/btcplusplus-2026.json",
      signalsFile,
      outDir,
      eventId: "btcpp-toronto-2026",
      sourceLogFile
    }) as BuildMeta;

    const outMeta = JSON.parse(await fs.readFile(path.join(outDir, "meta.json"), "utf8")) as BuildMeta;
    const outSourceLog = JSON.parse(await fs.readFile(path.join(outDir, "source-log.json"), "utf8"));

    expect(meta.realSignalCount).toBe(1);
    expect(outMeta.sampleSignalCount).toBe(1);
    expect(outMeta.sourceLaneCounts).toEqual([
      { sourceLane: "nostr_graph", inputCount: 1 },
      { sourceLane: "sample_fixture", inputCount: 1 }
    ]);
    expect(outSourceLog.lanes[1]).toMatchObject({ sourceLane: "nostr_notes", status: "zero_yield" });
  });
});
