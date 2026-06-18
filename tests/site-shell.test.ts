import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("public site shell", () => {
  it("links the favicon, about page, and HB1000 footer from the dashboard", () => {
    const html = fs.readFileSync("public/index.html", "utf8");

    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="./favicon.svg"');
    expect(html).toContain('href="./about.html"');
    expect(html).toContain("HB1000 fieldcraft lab");
    expect(html).toContain("Honesty is kindness.");
  });

  it("explains who Bitplus Signal is for and how it can be retooled", () => {
    const html = fs.readFileSync("public/about.html", "utf8");

    expect(html).toContain("Who this is for");
    expect(html).toContain("products, services, events, communities, and meetup groups");
    expect(html).toContain("Retool the signal map");
    expect(html).toContain("Honesty is kindness.");
    expect(html).toContain("generated-door-knocking-signal-mapping.png");
  });

  it("ships a repo-native SVG favicon", () => {
    const svg = fs.readFileSync("public/favicon.svg", "utf8");

    expect(svg).toContain("<svg");
    expect(svg).toContain("B+");
    expect(svg).toContain("Signal");
  });
});
