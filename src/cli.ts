#!/usr/bin/env node
import { Command } from "commander";
import { buildStaticData } from "./build.js";
import { readSignals, readTrustGraph, writeJson } from "./io.js";
import { scanNostr } from "./nostr.js";
import { refineDraft } from "./llm.js";
import { SignalMatch } from "./types.js";
import { checkOpenRouterModels } from "./models.js";
import { normalizeApifyItems, runApifyActor } from "./apify.js";
import { scanNostrTrustGraph } from "./nostrGraph.js";
import { signalsFromTrustGraph, trustGraphSliceForSignals } from "./reviewed.js";

const program = new Command();

program
  .name("bitplus-signal")
  .description("Find and score public conference-intent signals.")
  .version("0.1.0");

program
  .command("build")
  .description("Build static console data from event and signal files.")
  .requiredOption("--events <file>", "Conference event JSON file")
  .requiredOption("--signals <file>", "Public signal CSV or JSON file")
  .requiredOption("--out <dir>", "Output directory for static JSON")
  .option("--event-id <id>", "Only build matches for one event")
  .option("--trust-graph <file...>", "Optional trust graph JSON file(s)")
  .option("--source-log <file>", "Optional source/run log JSON file")
  .action(async (options: { events: string; signals: string; out: string; eventId?: string; trustGraph?: string[]; sourceLog?: string }) => {
    const meta = await buildStaticData({
      eventsFile: options.events,
      signalsFile: options.signals,
      outDir: options.out,
      eventId: options.eventId,
      trustGraphFile: options.trustGraph,
      sourceLogFile: options.sourceLog
    });
    console.log(`Built ${meta.matchCount} matches from ${meta.signalInputCount} public signals.`);
  });

program
  .command("review-nostr-graph")
  .description("Convert a raw public Nostr trust graph into a small reviewed signal file.")
  .requiredOption("--graph <file>", "Raw trust graph JSON, normally under data/real/")
  .requiredOption("--out <file>", "Reviewed signal JSON output")
  .option("--limit <number>", "Maximum reviewed rows", "12")
  .option("--source-lane <lane>", "Source lane label", "nostr_graph")
  .option("--posted-at <date>", "Review/publication date", "2026-06-17")
  .option("--trust-slice-out <file>", "Optional reviewed trust-graph slice output")
  .action(async (options: { graph: string; out: string; limit: string; sourceLane: string; postedAt: string; trustSliceOut?: string }) => {
    const graph = await readTrustGraph(options.graph);
    const rows = signalsFromTrustGraph(graph, {
      limit: Number.parseInt(options.limit, 10),
      sourceLane: options.sourceLane,
      postedAt: options.postedAt
    });
    await writeJson(options.out, rows);
    if (options.trustSliceOut) {
      await writeJson(options.trustSliceOut, trustGraphSliceForSignals(graph, rows));
    }
    console.log(`Wrote ${rows.length} reviewed real public signal rows.`);
  });

program
  .command("normalize")
  .description("Normalize a CSV or JSON source into Bitplus Signal JSON.")
  .requiredOption("--input <file>", "Input CSV or JSON")
  .requiredOption("--out <file>", "Output JSON file")
  .action(async (options: { input: string; out: string }) => {
    const signals = await readSignals(options.input);
    await writeJson(options.out, signals);
    console.log(`Wrote ${signals.length} normalized signals.`);
  });

program
  .command("scan-nostr")
  .description("Search public Nostr relays and write normalized signal JSON.")
  .requiredOption("--query <query>", "Nostr search query")
  .requiredOption("--out <file>", "Output JSON file")
  .option("--relay <url...>", "Relay URLs", [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net"
  ])
  .option("--limit <number>", "Maximum notes", "25")
  .option("--timeout-ms <number>", "Public relay search timeout in milliseconds", "15000")
  .action(async (options: { query: string; out: string; relay: string[]; limit: string; timeoutMs: string }) => {
    const signals = await scanNostr({
      query: options.query,
      relays: options.relay,
      limit: Number.parseInt(options.limit, 10),
      timeoutMs: Number.parseInt(options.timeoutMs, 10)
    });
    await writeJson(options.out, signals);
    console.log(`Wrote ${signals.length} Nostr signals.`);
  });

program
  .command("scan-nostr-graph")
  .description("Build a public Nostr trust graph from seed pubkeys and kind 3 follow lists.")
  .requiredOption("--seed <pubkey...>", "Hex or npub Nostr pubkeys to use as trust seeds")
  .requiredOption("--out <file>", "Output trust graph JSON file, preferably under data/real/")
  .option("--relay <url...>", "Relay URLs", [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net"
  ])
  .option("--max-followers-per-seed <number>", "Maximum follower lists per seed", "50")
  .option("--timeout-ms <number>", "Per-query timeout in milliseconds", "30000")
  .action(async (options: { seed: string[]; out: string; relay: string[]; maxFollowersPerSeed: string; timeoutMs: string }) => {
    const graph = await scanNostrTrustGraph({
      seedPubkeys: options.seed,
      relays: options.relay,
      maxFollowersPerSeed: Number.parseInt(options.maxFollowersPerSeed, 10),
      timeoutMs: Number.parseInt(options.timeoutMs, 10)
    });
    await writeJson(options.out, graph);
    console.log(`Wrote ${graph.profiles.length} public Nostr trust profiles.`);
  });

program
  .command("draft")
  .description("Optionally refine generated public drafts with OpenRouter.")
  .requiredOption("--input <file>", "Generated signal match JSON")
  .requiredOption("--out <file>", "Output JSON file")
  .option("--limit <number>", "Maximum rows to refine", "10")
  .action(async (options: { input: string; out: string; limit: string }) => {
    const rows = (await import("node:fs/promises").then((fs) =>
      fs.readFile(options.input, "utf8").then((content) => JSON.parse(content))
    )) as SignalMatch[];
    const limit = Number.parseInt(options.limit, 10);
    const refined = [];
    for (const [index, row] of rows.entries()) {
      if (index < limit && row.approvalStatus === "needs_human_review") {
        refined.push({ ...row, draftPublicReply: await refineDraft(row) });
      } else {
        refined.push(row);
      }
    }
    await writeJson(options.out, refined);
    console.log(`Wrote ${refined.length} rows. Refined up to ${limit}.`);
  });

program
  .command("model-check")
  .description("Check OpenRouter availability for the preferred open-source model set.")
  .action(async () => {
    const rows = await checkOpenRouterModels();
    for (const row of rows) {
      console.log(`${row.available ? "ok" : "missing"}\t${row.id}\t${row.label}\t${row.role}`);
    }
  });

program
  .command("apify-import")
  .description("Run an Apify actor and normalize public items into ignored local real-data JSON.")
  .requiredOption("--actor <id>", "Apify actor id, e.g. apify/twitter-scraper")
  .requiredOption("--input <file>", "Actor input JSON file")
  .requiredOption("--out <file>", "Output JSON file, preferably under data/real/")
  .option("--timeout <seconds>", "Apify run timeout seconds", "120")
  .action(async (options: { actor: string; input: string; out: string; timeout: string }) => {
    const items = await runApifyActor({
      actorId: options.actor,
      inputFile: options.input,
      timeoutSeconds: Number.parseInt(options.timeout, 10)
    });
    const rows = normalizeApifyItems(items);
    await writeJson(options.out, rows);
    console.log(`Wrote ${rows.length} normalized public rows from Apify.`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
