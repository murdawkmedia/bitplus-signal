# Bitplus Signal

Bitplus Signal is a public-intent finder for BTC++ and technical conference communities. It
scores public posts, notes, and imported leads against upcoming conferences, then
generates human-reviewed public reply drafts.

The first event pack is BTC++ 2026:

- Nairobi, open source edition, June 17-19, 2026
- Toronto, consensus edition, July 22-24, 2026
- Berlin, payments edition, Oct 1-3, 2026
- Seoul, privacy edition, Nov 5-6, 2026

Sources:

- BTC++ home: https://btcplusplus.dev
- BTC++ GitHub: https://github.com/btcplusplus
- OpenRouter GLM 5.1 model id: `z-ai/glm-5.1`

## Safety Model

- Public drafts only. No automated posting, no DMs, no follows, no likes.
- No private groups, private messages, customer dossiers, or scraped contact lists.
- API keys stay in your shell or `.env`; never commit them.
- The static console is a review surface. A human decides whether to engage.

## Quick Start

```powershell
npm install
npm run verify
npm run dev
```

Open the local URL from `serve` and review the ranked sample signals.

## Optional OpenRouter Drafting

The app can call OpenRouter for draft refinement, but the MVP works without a key.

```powershell
$env:OPENROUTER_API_KEY = "paste-your-openrouter-key-here"
$env:OPENROUTER_MODEL = "z-ai/glm-5.1"
node dist/cli.js draft --input public/data/signals.json --out public/data/signals.drafted.json
```

Do not paste real keys into repo files.

## CLI

Build static data:

```powershell
node dist/cli.js build `
  --events data/events/btcplusplus-2026.json `
  --signals data/samples/signals.json `
  --out public/data
```

Import public signals from CSV or JSON:

```powershell
node dist/cli.js normalize --input leads.csv --out data/samples/normalized.json
```

Search public Nostr relays:

```powershell
node dist/cli.js scan-nostr --query "bitcoin++" --out data/samples/nostr.json
```

## Data Contract

Inputs are public signals with these minimum fields:

- `platform`
- `sourceUrl`
- `excerpt`
- `postedAt`

Useful optional fields:

- `publicName`
- `locationHint`
- `topics`
- `visibility`

Generated matches include score, travel match, topic match, gate status, provenance,
and a draft public reply if the row is safe to engage.
