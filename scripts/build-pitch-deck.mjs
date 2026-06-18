import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "outputs", "pitch-deck");
const previewDir = path.join(outDir, "preview");
const layoutDir = path.join(outDir, "layout");
const pptxPath = path.join(outDir, "bitplus-signal-fullscreen-pitch.pptx");
const artifactToolPath =
  process.env.ARTIFACT_TOOL_PATH ??
  path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules",
    "@oai",
    "artifact-tool",
    "dist",
    "artifact_tool.mjs",
  );

const W = 1707;
const H = 1067;
const C = {
  paper: "#F7EFD9",
  cream: "#FFFAF0",
  ink: "#1F211C",
  muted: "#6F6A58",
  teal: "#2E6F72",
  tealDark: "#174F52",
  red: "#B94D3E",
  gold: "#E8B942",
  blue: "#21749A",
  green: "#5D7D4E",
  line: "#D8C592",
  soft: "#EFE0BB",
};

function pos(left, top, width, height) {
  return { left, top, width, height };
}

function addText(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: style.typeface ?? "Aptos",
    fontSize: style.fontSize ?? 24,
    bold: style.bold ?? false,
    color: style.color ?? C.ink,
    alignment: style.alignment ?? "left",
  };
  return shape;
}

function addBox(slide, position, fill, line = C.ink, width = 2, radius = "rounded-xl") {
  return slide.shapes.add({
    geometry: "roundRect",
    position,
    fill,
    line: { style: "solid", fill: line, width },
    borderRadius: radius,
  });
}

function addRect(slide, position, fill, line = "none", width = 0) {
  return slide.shapes.add({
    geometry: "rect",
    position,
    fill,
    line: { style: "solid", fill: line, width },
  });
}

function addEllipse(slide, position, fill, line = C.ink, width = 2) {
  return slide.shapes.add({
    geometry: "ellipse",
    position,
    fill,
    line: { style: "solid", fill: line, width },
  });
}

function addLine(slide, x, y, width, height, fill = C.ink) {
  addRect(slide, pos(x, y, width, height), fill, "none", 0);
}

function addHeader(slide, eyebrow, title, subtitle) {
  addText(slide, eyebrow, pos(84, 64, 520, 26), {
    fontSize: 16,
    bold: true,
    color: C.red,
  });
  addText(slide, title, pos(84, 100, 980, 116), {
    typeface: "Georgia",
    fontSize: 58,
    bold: true,
    color: C.ink,
  });
  if (subtitle) {
    addText(slide, subtitle, pos(88, 270, 820, 72), {
      fontSize: 25,
      color: C.muted,
    });
  }
}

function addFooter(slide, number) {
  addLine(slide, 84, 1004, 1340, 3, C.line);
  addText(slide, "Bitplus Signal / BTC++ Toronto hackathon pitch", pos(84, 1018, 620, 26), {
    fontSize: 14,
    bold: true,
    color: C.muted,
  });
  addText(slide, String(number).padStart(2, "0"), pos(1510, 1008, 110, 34), {
    fontSize: 20,
    bold: true,
    color: C.red,
    alignment: "right",
  });
}

function addSlide(presentation, number, notes) {
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;
  addRect(slide, pos(0, 0, W, H), C.paper);
  addRect(slide, pos(30, 30, W - 60, H - 60), "none", C.ink, 4);
  addRect(slide, pos(48, 48, W - 96, H - 96), "none", C.gold, 3);
  addFooter(slide, number);
  slide.speakerNotes.textFrame.setText(notes);
  slide.speakerNotes.setVisible(true);
  return slide;
}

function chip(slide, text, x, y, w, fill = C.soft) {
  addBox(slide, pos(x, y, w, 42), fill, C.ink, 2, "rounded-xl");
  addText(slide, text, pos(x + 18, y + 10, w - 36, 24), {
    fontSize: 17,
    bold: true,
    color: C.ink,
  });
}

function drawRouteBook(slide, x, y) {
  addBox(slide, pos(x, y, 220, 310), "#F2DCA8", C.ink, 4);
  addText(slide, "ROUTE", pos(x + 28, y + 28, 160, 38), {
    fontSize: 28,
    bold: true,
    color: C.ink,
  });
  for (let i = 0; i < 6; i++) {
    addLine(slide, x + 30, y + 86 + i * 34, 156, 3, i % 2 ? C.muted : C.teal);
  }
  addEllipse(slide, pos(x + 290, y + 62, 66, 66), C.gold, C.ink, 4);
  addLine(slide, x + 322, y + 128, 6, 142, C.ink);
  addLine(slide, x + 270, y + 180, 108, 6, C.ink);
  addLine(slide, x + 324, y + 268, 52, 6, C.ink);
  addLine(slide, x + 276, y + 268, 52, 6, C.ink);
  addBox(slide, pos(x + 430, y + 40, 70, 238), "#7B4D2F", C.ink, 4, "rounded-sm");
  addEllipse(slide, pos(x + 480, y + 158, 12, 12), C.gold, C.ink, 2);
}

function slideCover(presentation) {
  const slide = addSlide(
    presentation,
    1,
    [
      "Open: Bitplus Signal is door-to-door fieldcraft for the public internet.",
      "The story is not pressure selling. It is route discipline, public provenance, and human-reviewed outreach for BTC++ Toronto.",
      "Use this slide as the framing image before moving into the problem.",
    ],
  );
  drawRouteBook(slide, 930, 310);
  addBox(slide, pos(1040, 190, 460, 500), C.cream, C.ink, 4);
  addText(slide, "Top Opportunities", pos(1080, 230, 360, 36), {
    fontSize: 28,
    bold: true,
    color: C.tealDark,
  });
  [["BTC++ Toronto", "official event context"], ["NDC Toronto", "developer crossover"], ["Nostr builders", "trust graph clue"]].forEach((row, i) => {
    const y = 298 + i * 108;
    addBox(slide, pos(1080, y, 380, 76), i === 0 ? "#EAF4EE" : "#F8EED2", C.line, 2);
    addText(slide, row[0], pos(1102, y + 14, 260, 24), { fontSize: 21, bold: true, color: C.ink });
    addText(slide, row[1], pos(1102, y + 42, 260, 20), { fontSize: 15, color: C.muted });
    addEllipse(slide, pos(1400, y + 22, 30, 30), i === 0 ? C.teal : C.gold, C.ink, 2);
  });
  addLine(slide, 720, 520, 250, 8, C.red);
  addRect(slide, pos(950, 500, 34, 48), C.red);
  addText(slide, "Bitplus Signal", pos(84, 190, 780, 92), {
    typeface: "Georgia",
    fontSize: 76,
    bold: true,
    color: C.ink,
  });
  addText(slide, "Door-to-door fieldcraft for public conference signal mapping.", pos(92, 304, 650, 92), {
    fontSize: 30,
    color: C.muted,
  });
  chip(slide, "BTC++ Toronto", 92, 440, 220, C.teal);
  addText(slide, "July 22-24, 2026 / The Great Hall", pos(338, 450, 430, 28), {
    fontSize: 20,
    bold: true,
    color: C.ink,
  });
  addText(slide, "A judge-ready open-source demo that turns scattered public intent into a short human review queue.", pos(92, 760, 760, 84), {
    fontSize: 27,
    color: C.ink,
  });
}

function slideProblem(presentation) {
  const slide = addSlide(
    presentation,
    2,
    [
      "Problem: the audience already exists, but attention is fragmented.",
      "For BTC++ Toronto, the best people are builders, privacy folks, protocol people, local communities, and nearby crossover events.",
      "The organizer question is simple: what should I look at next?",
    ],
  );
  addHeader(
    slide,
    "THE PROBLEM",
    "The right audience is already talking.",
    "Organizers lose time because the useful route is scattered across platforms, events, and communities.",
  );
  const platforms = [
    ["X", 1070, 245, C.ink],
    ["Reddit", 1285, 305, C.red],
    ["LinkedIn", 990, 455, C.teal],
    ["Nostr", 1355, 520, C.blue],
    ["Events", 1140, 650, C.gold],
    ["Meetups", 830, 640, C.green],
  ];
  platforms.forEach(([label, x, y, color]) => {
    addEllipse(slide, pos(x, y, 110, 110), color, C.ink, 4);
    addText(slide, label, pos(x + 8, y + 42, 94, 24), {
      fontSize: 20,
      bold: true,
      color: color === C.gold ? C.ink : C.cream,
      alignment: "center",
    });
    addLine(slide, x + 55, y + 55, 250 - Math.abs(1090 - x) / 8, 5, C.line);
  });
  addBox(slide, pos(1030, 795, 330, 70), C.cream, C.ink, 3);
  addText(slide, "What should I look at next?", pos(1058, 815, 280, 28), {
    fontSize: 22,
    bold: true,
    color: C.red,
    alignment: "center",
  });
  [
    "Public posts disappear into feeds.",
    "Nearby events create hidden crossover.",
    "Generic crypto noise drowns out builders.",
  ].forEach((text, i) => {
    addBox(slide, pos(96, 390 + i * 116, 610, 76), C.cream, C.line, 2);
    addText(slide, text, pos(126, 410 + i * 116, 540, 28), { fontSize: 25, bold: true, color: C.ink });
  });
}

function slideOldPlaybook(presentation) {
  const slide = addSlide(
    presentation,
    3,
    [
      "This is where the door-to-door analogy becomes useful.",
      "The old playbook had a shadow side, so we keep only the ethical fieldcraft: give first, prove the value, respect community memory, and escalate to a human.",
    ],
  );
  addHeader(
    slide,
    "THE OLD PLAYBOOK",
    "Useful fieldcraft, not pressure.",
    "The Golden Age lesson is route discipline, trust, proof, and local memory.",
  );
  const cards = [
    ["Fuller Brush", "Give useful value first", C.teal],
    ["Avon", "Respect neighbor trust", C.red],
    ["Route Man", "Work a reliable route", C.gold],
    ["Tupperware", "Notice community proof", C.green],
    ["Kirby", "Prove the signal", C.blue],
    ["Network Builder", "Warm proximity, human decides", C.ink],
  ];
  cards.forEach(([name, body, color], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 98 + col * 505;
    const y = 365 + row * 205;
    addBox(slide, pos(x, y, 430, 150), C.cream, C.ink, 3);
    addEllipse(slide, pos(x + 26, y + 30, 54, 54), color, C.ink, 2);
    addText(slide, name, pos(x + 104, y + 28, 260, 30), { fontSize: 24, bold: true, color: C.ink });
    addText(slide, body, pos(x + 104, y + 72, 280, 44), { fontSize: 20, color: C.muted });
  });
  addText(slide, "Do not copy the pressure. Keep the fieldcraft.", pos(100, 850, 990, 42), {
    fontSize: 31,
    bold: true,
    color: C.red,
  });
}

function slideTranslation(presentation) {
  const slide = addSlide(
    presentation,
    4,
    [
      "Bitplus Signal translates the route book into a public-source pipeline.",
      "Public evidence enters; weak or private data is blocked; only reviewed high-fit rows get suggested public replies.",
    ],
  );
  addHeader(
    slide,
    "THE MODERN TRANSLATION",
    "A public route book for builder conferences.",
    "Public evidence flows through scoring and safety before a human decides whether to reply.",
  );
  const steps = [
    ["Public source", "post / event / note"],
    ["Normalize", "one signal shape"],
    ["Score", "topic + geo + trust"],
    ["Gate", "block weak/private"],
    ["Draft", "public reply only"],
    ["Human review", "approve or skip"],
  ];
  steps.forEach(([title, body], i) => {
    const x = 98 + i * 258;
    addBox(slide, pos(x, 468, 210, 150), i === 3 ? "#F7D8D1" : C.cream, C.ink, 3);
    addText(slide, title, pos(x + 18, 496, 176, 30), { fontSize: 22, bold: true, color: i === 3 ? C.red : C.tealDark });
    addText(slide, body, pos(x + 18, 536, 170, 44), { fontSize: 17, color: C.muted });
    if (i < steps.length - 1) {
      addLine(slide, x + 214, 540, 42, 7, C.red);
    }
  });
  chip(slide, "X", 134, 330, 74);
  chip(slide, "Reddit", 224, 330, 124);
  chip(slide, "LinkedIn", 364, 330, 142);
  chip(slide, "Nostr", 522, 330, 112);
  chip(slide, "Events", 650, 330, 122);
  chip(slide, "Communities", 788, 330, 174);
  addText(slide, "The output is not a blast list. It is a short, explainable review queue.", pos(110, 746, 1280, 54), {
    fontSize: 34,
    bold: true,
    color: C.ink,
  });
}

function slideDemo(presentation) {
  const slide = addSlide(
    presentation,
    5,
    [
      "Demo: open Top Opportunities.",
      "The default view is intentionally simple: why it matters, source, fit, suggested public reply, and confidence.",
      "The detail drawer keeps provenance and safety visible so a human can decide.",
    ],
  );
  addHeader(
    slide,
    "PRODUCT DEMO",
    "Top Opportunities, not a haystack.",
    "The console answers one question first: what should I look at next?",
  );
  addBox(slide, pos(92, 330, 1510, 560), C.cream, C.ink, 4);
  addRect(slide, pos(92, 330, 1510, 70), C.tealDark, C.ink, 0);
  addText(slide, "Top Opportunities", pos(128, 350, 380, 34), { fontSize: 28, bold: true, color: C.cream });
  addText(slide, "33 reviewed public signals / 6 source lanes / human review required", pos(1020, 354, 520, 28), {
    fontSize: 18,
    bold: true,
    color: C.cream,
    alignment: "right",
  });
  const cards = [
    ["BTC++ Toronto", "Official event context", "Fit 90", "Use as the anchor for BTC++ consensus conversations."],
    ["NDC Toronto", "Developer crossover", "Fit 88", "A local software audience with security, AI, and tooling overlap."],
    ["Nostr builders", "Trust graph clue", "Fit 82", "Review public proximity before deciding whether to engage."],
  ];
  cards.forEach(([title, source, fit, body], i) => {
    const x = 132 + i * 470;
    addBox(slide, pos(x, 450, 410, 315), i === 0 ? "#EAF4EE" : "#FFF4D2", C.line, 3);
    addText(slide, title, pos(x + 26, 478, 280, 34), { fontSize: 26, bold: true, color: C.ink });
    addText(slide, source, pos(x + 26, 516, 260, 24), { fontSize: 17, bold: true, color: C.red });
    addBox(slide, pos(x + 286, 478, 92, 42), i === 0 ? C.teal : C.gold, C.ink, 2);
    addText(slide, fit, pos(x + 296, 490, 72, 20), { fontSize: 16, bold: true, color: i === 0 ? C.cream : C.ink, alignment: "center" });
    addText(slide, body, pos(x + 26, 576, 340, 72), { fontSize: 21, color: C.ink });
    addRect(slide, pos(x + 26, 688, 350, 3), C.line);
    addText(slide, "Suggested reply: helpful, specific, no direct shill.", pos(x + 26, 708, 340, 30), { fontSize: 16, bold: true, color: C.muted });
  });
}

function slideData(presentation) {
  const slide = addSlide(
    presentation,
    6,
    [
      "The demo is powered by reviewed public data, not private scraping.",
      "Current build: 33 reviewed public signals, zero sample rows in the live build, and six source lanes.",
    ],
  );
  addHeader(
    slide,
    "DATA ENGINE",
    "Real public rows, reviewed before they ship.",
    "The build favors evidence quality over raw volume.",
  );
  const kpis = [["33", "reviewed public signals"], ["6", "source lanes"], ["0", "sample rows in live build"]];
  kpis.forEach(([num, label], i) => {
    addBox(slide, pos(100, 350 + i * 145, 420, 104), C.cream, C.ink, 3);
    addText(slide, num, pos(132, 370 + i * 145, 110, 54), { fontSize: 52, bold: true, color: C.red });
    addText(slide, label, pos(250, 388 + i * 145, 230, 34), { fontSize: 22, bold: true, color: C.ink });
  });
  const bars = [
    ["nostr_graph", 12, C.teal],
    ["adjacent_event_official", 10, C.red],
    ["historical_event_context", 5, C.gold],
    ["community_context", 3, C.green],
    ["conference_window_crossover", 2, C.blue],
    ["apify_linkedin", 1, C.ink],
  ];
  bars.forEach(([name, count, color], i) => {
    const y = 350 + i * 78;
    addText(slide, name, pos(650, y + 10, 360, 24), { fontSize: 19, bold: true, color: C.ink });
    addRect(slide, pos(1030, y + 10, 470, 28), "#EBD9AE", "none", 0);
    addRect(slide, pos(1030, y + 10, count * 36, 28), color, "none", 0);
    addText(slide, String(count), pos(1520, y + 6, 50, 28), { fontSize: 20, bold: true, color: C.ink, alignment: "right" });
  });
}

function slideSafety(presentation) {
  const slide = addSlide(
    presentation,
    7,
    [
      "Safety is a product feature, not a footnote.",
      "The system does not DM, follow, like, submit forms, harvest contacts, or post automatically.",
      "Trust-only rows are hidden by default and draftless.",
    ],
  );
  addHeader(
    slide,
    "SAFETY MODEL",
    "No autopilot. No private data. Human approval.",
    "Bitplus Signal is designed against the shadow side of old sales patterns.",
  );
  addBox(slide, pos(592, 330, 520, 310), "#EAF4EE", C.ink, 4);
  addEllipse(slide, pos(780, 376, 150, 150), C.teal, C.ink, 4);
  addText(slide, "HUMAN\nREVIEW", pos(800, 424, 110, 72), { fontSize: 24, bold: true, color: C.cream, alignment: "center" });
  addText(slide, "public provenance + useful context + approval", pos(652, 548, 400, 44), { fontSize: 24, bold: true, color: C.ink, alignment: "center" });
  const blocked = ["No DMs", "No private groups", "No harvested contacts", "No autoposting", "No pressure scripts"];
  blocked.forEach((text, i) => chip(slide, text, 126, 342 + i * 84, 330, "#F7D8D1"));
  const allowed = ["Public posts", "Event pages", "Explainable scoring", "Draft-only replies", "Provenance links"];
  allowed.forEach((text, i) => chip(slide, text, 1228, 342 + i * 84, 330, "#EAF4EE"));
  addText(slide, "The rule: public evidence in, human judgment out.", pos(390, 760, 920, 52), {
    fontSize: 38,
    bold: true,
    color: C.red,
    alignment: "center",
  });
}

function slideAsk(presentation) {
  const slide = addSlide(
    presentation,
    8,
    [
      "Close with the ask.",
      "This can become an open-source outreach intelligence layer for builder conferences.",
      "The thesis: the next great conference growth tool is not an ad machine. It is an ethical public-route engine.",
    ],
  );
  addHeader(
    slide,
    "THE ASK",
    "Open-source the route engine for builder events.",
    "Start with BTC++ Toronto. Reuse the pattern for any technical community gathering.",
  );
  addBox(slide, pos(110, 372, 430, 290), C.cream, C.ink, 3);
  addText(slide, "Now", pos(142, 406, 180, 40), { fontSize: 32, bold: true, color: C.red });
  addText(slide, "Judge-ready demo with real public data, safety gates, and a human review queue.", pos(142, 468, 330, 100), { fontSize: 24, color: C.ink });
  addBox(slide, pos(640, 372, 430, 290), C.cream, C.ink, 3);
  addText(slide, "Next", pos(672, 406, 180, 40), { fontSize: 32, bold: true, color: C.teal });
  addText(slide, "More source connectors, richer trust graph, CRM handoff, reusable event packs.", pos(672, 468, 330, 100), { fontSize: 24, color: C.ink });
  addBox(slide, pos(1170, 372, 330, 290), "#EAF4EE", C.ink, 3);
  addText(slide, "Thesis", pos(1202, 406, 180, 40), { fontSize: 32, bold: true, color: C.ink });
  addText(slide, "Not an ad machine. An ethical public-route engine.", pos(1202, 468, 250, 108), { fontSize: 27, bold: true, color: C.red });
  addLine(slide, 540, 510, 100, 8, C.red);
  addLine(slide, 1070, 510, 100, 8, C.red);
  addText(slide, "Bitplus Signal turns scattered public intent into the next useful conversation.", pos(160, 780, 1360, 58), {
    fontSize: 42,
    bold: true,
    color: C.ink,
    alignment: "center",
  });
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function main() {
  const { Presentation, PresentationFile } = await import(
    pathToFileURL(artifactToolPath).href
  );

  await fs.mkdir(previewDir, { recursive: true });
  await fs.mkdir(layoutDir, { recursive: true });

  const presentation = Presentation.create({
    slideSize: { width: W, height: H },
  });

  slideCover(presentation);
  slideProblem(presentation);
  slideOldPlaybook(presentation);
  slideTranslation(presentation);
  slideDemo(presentation);
  slideData(presentation);
  slideSafety(presentation);
  slideAsk(presentation);

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(
      path.join(previewDir, `${stem}.png`),
      await presentation.export({ slide, format: "png", scale: 1 }),
    );
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(layoutDir, `${stem}.layout.json`), await layout.text());
  }

  await writeBlob(
    path.join(outDir, "bitplus-signal-fullscreen-pitch-montage.webp"),
    await presentation.export({ format: "webp", montage: true, scale: 1 }),
  );

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(pptxPath);
  console.log(`Wrote ${pptxPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
