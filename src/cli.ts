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
import { dedupeSignalsBySourceUrl, reviewSocialSignals } from "./socialReview.js";

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
  .option("--raw-out <file>", "Optional raw Apify dataset output, preferably under data/real/")
  .option("--max-charged-items <number>", "Maximum paid dataset items allowed for pay-per-result actors", "100")
  .action(async (options: { actor: string; input: string; out: string; timeout: string; rawOut?: string; maxChargedItems: string }) => {
    const items = await runApifyActor({
      actorId: options.actor,
      inputFile: options.input,
      timeoutSeconds: Number.parseInt(options.timeout, 10),
      maxChargedItems: Number.parseInt(options.maxChargedItems, 10)
    });
    if (options.rawOut) await writeJson(options.rawOut, items);
    const rows = normalizeApifyItems(items);
    await writeJson(options.out, rows);
    console.log(`Wrote ${rows.length} normalized public rows from Apify.`);
  });

program
  .command("apify-normalize")
  .description("Normalize a saved raw Apify dataset JSON without launching an actor.")
  .requiredOption("--input <file>", "Raw Apify dataset JSON")
  .requiredOption("--out <file>", "Output normalized JSON")
  .action(async (options: { input: string; out: string }) => {
    const raw = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(options.input, "utf8")));
    const rows = normalizeApifyItems(Array.isArray(raw) ? raw : []);
    await writeJson(options.out, rows);
    console.log(`Wrote ${rows.length} normalized public rows from saved Apify raw data.`);
  });

program
  .command("review-social")
  .description("Review expanded social imports and merge high-fit public rows into a reviewed signal file.")
  .requiredOption("--input <file...>", "Normalized social JSON input file(s)")
  .requiredOption("--out <file>", "Reviewed signal JSON output")
  .option("--base <file>", "Existing reviewed signal JSON file to preserve")
  .option("--blocked-out <file>", "Optional rejected-row audit JSON, preferably under data/real/")
  .option("--reference-date <date>", "Reference date for rolling windows", "2026-06-17")
  .option("--primary-window-days <number>", "Primary lookback days", "30")
  .option("--fallback-window-days <number>", "Fallback lookback days", "60")
  .option("--fallback-threshold <number>", "Use fallback when primary published count is below this", "10")
  .option("--exclude-start-date <date>", "Exclude rows on or after this date")
  .option("--exclude-end-date <date>", "Exclude rows on or before this date")
  .action(async (options: {
    input: string[];
    out: string;
    base?: string;
    blockedOut?: string;
    referenceDate: string;
    primaryWindowDays: string;
    fallbackWindowDays: string;
    fallbackThreshold: string;
    excludeStartDate?: string;
    excludeEndDate?: string;
  }) => {
    const base = options.base ? await readSignals(options.base) : [];
    const socialRows = (await Promise.all(options.input.map((file) => readSignals(file)))).flat();
    const result = reviewSocialSignals(socialRows, {
      referenceDate: options.referenceDate,
      primaryWindowDays: Number.parseInt(options.primaryWindowDays, 10),
      fallbackWindowDays: Number.parseInt(options.fallbackWindowDays, 10),
      fallbackThreshold: Number.parseInt(options.fallbackThreshold, 10),
      excludeStartDate: options.excludeStartDate,
      excludeEndDate: options.excludeEndDate
    });
    const merged = dedupeSignalsBySourceUrl([...base, ...result.published]);
    await writeJson(options.out, merged);
    if (options.blockedOut) {
      await writeJson(options.blockedOut, {
        reviewedAt: options.referenceDate,
        usedWindowDays: result.usedWindowDays,
        inputCount: socialRows.length,
        publishedCount: result.published.length,
        blocked: result.blocked
      });
    }
    console.log(`Merged ${result.published.length} reviewed social rows into ${merged.length} total signals; ${result.blocked.length} blocked.`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
