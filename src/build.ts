import path from "node:path";
import { readEvents, readSignals, readTrustGraph, writeJson } from "./io.js";
import { buildMatches } from "./scoring.js";
import { BuildMeta, TrustGraph } from "./types.js";

export interface BuildOptions {
  eventsFile: string;
  signalsFile: string;
  outDir: string;
  eventId?: string;
  trustGraphFile?: string | string[];
}

function mergeTrustGraphs(graphs: TrustGraph[]): TrustGraph | undefined {
  if (graphs.length === 0) return undefined;
  const profiles = new Map<string, TrustGraph["profiles"][number]>();
  const conferences = new Map<string, TrustGraph["conferences"][number]>();
  for (const graph of graphs) {
    for (const profile of graph.profiles) {
      const existing = profiles.get(profile.id);
      profiles.set(profile.id, existing ? {
        ...existing,
        ...profile,
        trustSeed: existing.trustSeed || profile.trustSeed,
        follows: [...new Set([...existing.follows, ...profile.follows])],
        followedBy: [...new Set([...existing.followedBy, ...profile.followedBy])],
        conferenceRefs: [...new Set([...existing.conferenceRefs, ...profile.conferenceRefs])],
        topics: [...new Set([...existing.topics, ...profile.topics])],
        locationHints: [...new Set([...existing.locationHints, ...profile.locationHints])]
      } : profile);
    }
    for (const conference of graph.conferences) {
      conferences.set(conference.id, { ...conferences.get(conference.id), ...conference });
    }
  }
  return { profiles: [...profiles.values()], conferences: [...conferences.values()] };
}

export async function buildStaticData(options: BuildOptions): Promise<BuildMeta> {
  const allEvents = await readEvents(options.eventsFile);
  const events = options.eventId
    ? allEvents.filter((event) => event.id === options.eventId)
    : allEvents;
  if (options.eventId && events.length === 0) {
    throw new Error(`Unknown event id: ${options.eventId}`);
  }
  const signals = await readSignals(options.signalsFile);
  const graphFiles = Array.isArray(options.trustGraphFile)
    ? options.trustGraphFile
    : options.trustGraphFile ? [options.trustGraphFile] : [];
  const graph = mergeTrustGraphs(await Promise.all(graphFiles.map((file) => readTrustGraph(file))));
  const matches = buildMatches(events, signals, graph);
  const meta: BuildMeta = {
    builtAt: process.env.BITPLUS_SIGNAL_BUILD_AT ?? "2026-06-17T00:00:00.000Z",
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
