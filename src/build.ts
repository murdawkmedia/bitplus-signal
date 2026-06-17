import path from "node:path";
import { readEvents, readSignals, writeJson } from "./io.js";
import { buildMatches } from "./scoring.js";
import { BuildMeta } from "./types.js";

export interface BuildOptions {
  eventsFile: string;
  signalsFile: string;
  outDir: string;
}

export async function buildStaticData(options: BuildOptions): Promise<BuildMeta> {
  const events = await readEvents(options.eventsFile);
  const signals = await readSignals(options.signalsFile);
  const matches = buildMatches(events, signals);
  const meta: BuildMeta = {
    builtAt: new Date().toISOString(),
    eventCount: events.length,
    signalInputCount: signals.length,
    matchCount: matches.length,
    sourceMode: "csv-json-imports-plus-nostr"
  };

  await writeJson(path.join(options.outDir, "events.json"), events);
  await writeJson(path.join(options.outDir, "signals.json"), matches);
  await writeJson(path.join(options.outDir, "meta.json"), meta);
  return meta;
}

