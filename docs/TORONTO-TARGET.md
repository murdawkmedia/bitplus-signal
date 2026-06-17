# BTC++ Toronto Target

Bitplus Signal now defaults to the BTC++ Toronto target: consensus edition,
July 22-24, 2026 at The Great Hall in Toronto, Canada.

## What Is Real

- Event metadata comes from the public BTC++ Toronto page.
- The adjacent source plan references public pages and search queries.
- The default public console uses 26 reviewed real public rows for BTC++ Toronto:
  12 Nostr graph rows, 3 Apify X rows, 10 official adjacent-event rows, and
  1 public LinkedIn row.
- `data/sources/real-data-run-log.json` records the public source lanes, yielded
  counts, zero-yield searches, published rows, low-quality blocks, and Apify
  lanes blocked by the current usage balance.
- The checked-in trust graph for real rows is a compact reviewed slice, not the
  raw graph import.

## Why Keep Raw Imports Ignored

This repo is public. Public-source leads can still identify handles, communities,
and intent. Store raw imports under `data/real/`, which is ignored by git. Only
publish a row after explicit review into `data/reviewed/`.

## Target Profile

Prioritize public signals from:

- Toronto and GTA Bitcoin developers.
- Canadian Bitcoin protocol, cryptography, wallet, or node contributors.
- Direct-flight seed cities including Edmonton, Calgary, Vancouver, Montreal,
  Ottawa, Winnipeg, New York, Chicago, Boston, Seattle, San Francisco, Austin,
  and London.
- People already discussing consensus, protocol review, node policy,
  ossification, Bitcoin Core, wallets, Lightning, privacy, or open-source
  Bitcoin tooling.
- Public side-event seekers around Toronto crypto events on July 21-24, 2026.

## Geo And Audience Policy

Bitplus Signal now separates location fit from audience breadth:

- Toronto, GTA, Ontario, nearby drive-region, and curated under-three-hour
  direct-flight seeds can include the broader builder-crypto audience: Bitcoin,
  Ethereum/Web3, privacy, AI/open-source, security, hackathons, and developer
  tooling.
- Longer direct-flight, far, international, or unknown-location rows stay in the
  console only when the signal is Bitcoin/freedom-tech specific: Bitcoin,
  Lightning, Nostr, self-custody, protocol, consensus, privacy, cryptography, or
  censorship resistance.
- Same-week crossover conference pages in the July 15-31, 2026 window are kept
  as event evidence and used to seed searches for public speaker, sponsor,
  attendee, and side-event posts. Event pages alone are not treated like direct
  buyer intent.
- Graph-only Nostr profiles are trust candidates, hidden from the default board
  and draftless until recent public notes or profile metadata provide topical
  evidence.
- The three-hour band is a targeting heuristic, not a live airline schedule or
  travel promise.
- Unknown Nostr/social rows are kept visible as Bitcoin-only/needs-location-
  review instead of being silently removed.

## Operating Rules

- Public provenance links only.
- Draft public replies only.
- No DMs, private groups, harvested contact lists, automated follows, likes,
  replies, form submissions, or ticket/travel claims without organizer review.
- Facebook and Instagram stay manual/supervised unless a reviewed public API or
  export path is added.

## Useful Commands

Build the reviewed Toronto console:

```powershell
npm run build
```

Build the synthetic-only sample console:

```powershell
npm run build:sample
```

Build the full BTC++ 2026 pack:

```powershell
npm run build:all
```

Scan public Nostr relays into an ignored local file:

```powershell
npm run scan:toronto:nostr
```

Scan public Apify X and Reddit lanes into ignored local files:

```powershell
npm run scan:toronto:apify
npm run scan:toronto:apify:reddit
```

Run the expanded public social canaries after loading `APIFY_TOKEN` locally:

```powershell
npm run scan:toronto:apify:x-expanded
npm run scan:toronto:apify:reddit-expanded
npm run scan:toronto:apify:linkedin
npm run scan:toronto:apify:tiktok
npm run scan:toronto:apify:instagram
npm run scan:toronto:apify:facebook
npm run review:social-expanded
```

Check OpenRouter's preferred open-source model set:

```powershell
npm run models:check
```
