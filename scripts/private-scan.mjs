import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const deny = [
  ["private hospitality brand", ["S", "eba"].join("")],
  ["private campground brand", ["Koka", "nee"].join("")],
  ["private booking vendor", ["Res", "Nexus"].join("")],
  ["google sheet id shape", "spreadsheets/d/"],
  ["cloudflare account id shape", "CLOUDFLARE_ACCOUNT_ID"],
  ["openrouter key", "sk-or-v1-"]
];
const skipDirs = new Set([".git", "node_modules", "dist", "coverage"]);
const skipFiles = new Set(["scripts/private-scan.mjs", "package-lock.json"]);

function walk(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) found.push(...walk(full));
      continue;
    }
    if (skipFiles.has(rel)) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const [label, needle] of deny) {
      if (text.includes(needle)) found.push(`${rel}: ${label}`);
    }
  }
  return found;
}

const hits = walk(root);
if (hits.length) {
  console.error("Private-string scan failed:");
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}
console.log("Private-string scan passed.");

