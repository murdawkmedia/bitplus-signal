# BTC++ Toronto Target

Bitplus Signal now defaults to the BTC++ Toronto target: consensus edition,
July 22-24, 2026 at The Great Hall in Toronto, Canada.

## What Is Real

- Event metadata comes from the public BTC++ Toronto page.
- The adjacent source plan references public pages and search queries.
- The trust graph seed file uses public entities plus synthetic demo profiles.
- The public demo rows are synthetic fixtures, not real people or real posts.

## Why Keep Demo Leads Synthetic

This repo is public. Real public-source leads can still identify people, handles,
communities, and intent. Store live imports under `data/real/`, which is ignored
by git, or in a reviewed CRM. Only publish a real row after explicit human review.

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

Build the Toronto demo:

```powershell
npm run build
```

Build the full BTC++ 2026 pack:

```powershell
npm run build:all
```

Scan public Nostr relays into an ignored local file:

```powershell
npm run scan:toronto:nostr
```

Check OpenRouter's preferred open-source model set:

```powershell
npm run models:check
```
