#!/usr/bin/env node
import { Command } from "commander";
import { buildStaticData } from "./build.js";
import { readSignals, writeJson } from "./io.js";
import { scanNostr } from "./nostr.js";
import { refineDraft } from "./llm.js";
import { SignalMatch } from "./types.js";

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
  .action(async (options: { events: string; signals: string; out: string }) => {
    const meta = await buildStaticData({
      eventsFile: options.events,
      signalsFile: options.signals,
      outDir: options.out
    });
    console.log(`Built ${meta.matchCount} matches from ${meta.signalInputCount} public signals.`);
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
  .action(async (options: { query: string; out: string; relay: string[]; limit: string }) => {
    const signals = await scanNostr({
      query: options.query,
      relays: options.relay,
      limit: Number.parseInt(options.limit, 10)
    });
    await writeJson(options.out, signals);
    console.log(`Wrote ${signals.length} Nostr signals.`);
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

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
