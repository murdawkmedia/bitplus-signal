# BTC++ Toronto Target

Bitplus Signal now defaults to the BTC++ Toronto target: consensus edition,
July 22-24, 2026 at The Great Hall in Toronto, Canada.

## What Is Real

- Event metadata comes from the public BTC++ Toronto page.
- The adjacent source plan references public pages and search queries.
- The default public console uses 15 reviewed real public rows for BTC++ Toronto:
  12 Nostr graph rows and 3 Apify X rows.
- `data/sources/real-data-run-log.json` records the public source lanes, yielded
  counts, zero-yield searches, published Apify X rows, and Reddit rows blocked
  for low target quality.
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

Check OpenRouter's preferred open-source model set:

```powershell
npm run models:check
```
