import { PublicSignal } from "./types.js";

export interface SocialReviewOptions {
  referenceDate?: string;
  primaryWindowDays?: number;
  fallbackWindowDays?: number;
  fallbackThreshold?: number;
}

export interface BlockedSocialSignal {
  signal: PublicSignal;
  reason:
    | "blocked_private"
    | "outside_date_window"
    | "duplicate_source"
    | "low_target_quality";
}

export interface SocialReviewResult {
  published: PublicSignal[];
  blocked: BlockedSocialSignal[];
  usedWindowDays: number;
}

const ADJACENT_EVENTS: Array<{ pattern: RegExp; ref: string }> = [
  { pattern: /\bbtc\+\+|\bbtcplusplus\b|\bbtcpp\.dev\b|\bbitcoin\+\+/i, ref: "btcpp-toronto-2026" },
  { pattern: /\btoronto tech week\b/i, ref: "adjacent:toronto-tech-week" },
  { pattern: /\bndc toronto\b/i, ref: "adjacent:ndc-toronto" },
  { pattern: /\bwaterloo tech week\b/i, ref: "adjacent:waterloo-tech-week" },
  { pattern: /\bjamhacks?\b/i, ref: "adjacent:jamhacks" },
  { pattern: /\bconhacks?\b/i, ref: "adjacent:conhacks" },
  { pattern: /\bbearhacks?\b/i, ref: "adjacent:bearhacks" },
  { pattern: /\bhack canada\b/i, ref: "adjacent:hack-canada" },
  { pattern: /\beth\s*toronto\b|\bethtoronto\b/i, ref: "adjacent:ethtoronto" },
  { pattern: /\bblockchain futurist\b/i, ref: "adjacent:blockchain-futurist" },
  { pattern: /\bethwomen\b/i, ref: "adjacent:ethwomen" },
  { pattern: /\btoronto bitcoin\b|\bbitdevs\b/i, ref: "adjacent:toronto-bitcoin" }
];

const LOCAL_REGIONAL_PATTERN = /\b(toronto|mississauga|brampton|hamilton|kitchener|waterloo|guelph|london|windsor|niagara|markham|richmond hill|oakville|burlington|barrie|kingston|ottawa|buffalo|rochester|detroit|cleveland)\b/i;

const THEME_PATTERN = /\b(bitcoin|ethereum|web3|crypto|cryptography|privacy|security|freedom tech|open source|open-source|open systems|ai|zk|zero knowledge|nostr|self custody|protocol|consensus|hackathon|developer|developers|builder|builders|software|devtools?|cipherpunk|cypherpunk)\b/i;

const LOW_QUALITY_PATTERN = /\b(price|prices|trading|trader|traders|chart|charts|etf|inflow|inflows|outflow|outflows|market cap|moon|pump|dump|bullish|bearish|signal(s)?|token launch|airdrop)\b/i;

const PRIVATE_VISIBILITIES = new Set<PublicSignal["visibility"]>(["private", "dm", "login_gated"]);

function normalizeSourceUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString().toLowerCase();
  } catch {
    return trimmed.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
  }
}

function signalText(signal: PublicSignal): string {
  return [
    signal.platform,
    signal.sourceUrl,
    signal.publicName,
    signal.excerpt,
    signal.locationHint,
    ...signal.topics,
    ...signal.conferenceRefs
  ].join(" ");
}

function eventText(signal: PublicSignal): string {
  return [
    signal.platform,
    signal.sourceUrl,
    signal.publicName,
    signal.excerpt,
    ...signal.conferenceRefs
  ].join(" ");
}

function dateInWindow(postedAt: string, referenceDate: string, windowDays: number): boolean {
  if (!postedAt) return true;
  const posted = new Date(postedAt);
  const reference = new Date(`${referenceDate}T23:59:59.999Z`);
  if (Number.isNaN(posted.getTime()) || Number.isNaN(reference.getTime())) return true;
  const start = new Date(reference);
  start.setUTCDate(start.getUTCDate() - windowDays);
  return posted >= start && posted <= reference;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function matchedEventRefs(text: string): string[] {
  return ADJACENT_EVENTS
    .filter((event) => event.pattern.test(text))
    .map((event) => event.ref);
}

function enrichSignal(signal: PublicSignal, refs: string[]): PublicSignal {
  return {
    ...signal,
    topics: unique([
      ...signal.topics,
      "builder-crypto-broad",
      "freedom-tech-adjacent"
    ]),
    conferenceRefs: unique([...signal.conferenceRefs, ...refs])
  };
}

function highFit(signal: PublicSignal): { accepted: true; signal: PublicSignal } | { accepted: false; reason: "low_target_quality" } {
  const text = signalText(signal);
  const refs = matchedEventRefs(eventText(signal));
  const direct = refs.includes("btcpp-toronto-2026");
  const eventAdjacent = refs.some((ref) => ref.startsWith("adjacent:"));
  const regional = LOCAL_REGIONAL_PATTERN.test(text);
  const themed = THEME_PATTERN.test(text);
  const lowQuality = LOW_QUALITY_PATTERN.test(text) && !direct && !eventAdjacent;

  if (lowQuality || !(direct || eventAdjacent || (regional && themed))) {
    return { accepted: false, reason: "low_target_quality" };
  }

  return { accepted: true, signal: enrichSignal(signal, refs) };
}

function reviewWithinWindow(signals: PublicSignal[], options: Required<SocialReviewOptions>): SocialReviewResult {
  const blocked: BlockedSocialSignal[] = [];
  const published: PublicSignal[] = [];
  const seenUrls = new Set<string>();

  for (const signal of signals) {
    if (PRIVATE_VISIBILITIES.has(signal.visibility)) {
      blocked.push({ signal, reason: "blocked_private" });
      continue;
    }

    if (!dateInWindow(signal.postedAt, options.referenceDate, options.primaryWindowDays)) {
      blocked.push({ signal, reason: "outside_date_window" });
      continue;
    }

    const key = normalizeSourceUrl(signal.sourceUrl);
    if (seenUrls.has(key)) {
      blocked.push({ signal, reason: "duplicate_source" });
      continue;
    }
    seenUrls.add(key);

    const fit = highFit(signal);
    if (!fit.accepted) {
      blocked.push({ signal, reason: fit.reason });
      continue;
    }

    published.push(fit.signal);
  }

  return {
    published,
    blocked,
    usedWindowDays: options.primaryWindowDays
  };
}

export function reviewSocialSignals(signals: PublicSignal[], rawOptions: SocialReviewOptions = {}): SocialReviewResult {
  const options: Required<SocialReviewOptions> = {
    referenceDate: rawOptions.referenceDate ?? "2026-06-17",
    primaryWindowDays: rawOptions.primaryWindowDays ?? 30,
    fallbackWindowDays: rawOptions.fallbackWindowDays ?? 60,
    fallbackThreshold: rawOptions.fallbackThreshold ?? 10
  };

  const primary = reviewWithinWindow(signals, options);
  if (primary.published.length >= options.fallbackThreshold) return primary;

  const fallback = reviewWithinWindow(signals, {
    ...options,
    primaryWindowDays: options.fallbackWindowDays
  });
  return {
    ...fallback,
    usedWindowDays: options.fallbackWindowDays
  };
}

export function dedupeSignalsBySourceUrl(signals: PublicSignal[]): PublicSignal[] {
  const seen = new Set<string>();
  const byKey = new Map<string, PublicSignal>();
  for (const signal of signals) {
    const key = normalizeSourceUrl(signal.sourceUrl);
    if (!seen.has(key)) seen.add(key);
    byKey.set(key, signal);
  }
  const deduped: PublicSignal[] = [];
  for (const key of seen) {
    const signal = byKey.get(key);
    if (!signal) continue;
    deduped.push(signal);
  }
  return deduped;
}
