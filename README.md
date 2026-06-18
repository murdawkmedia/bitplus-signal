# Bitplus Signal

Bitplus Signal is a public-intent finder for BTC++ and technical conference communities. It
scores public posts, notes, and imported leads against upcoming conferences, then
generates human-reviewed public reply drafts.

The default demo now targets BTC++ Toronto: consensus edition, July 22-24, 2026
at The Great Hall in Toronto, Canada.

It also includes trust-proximity scoring: public graph nearness to BTC++ /
Bitcoin-dev seeds, plus similar-conference affinity.

The first event pack is BTC++ 2026:

- Nairobi, open source edition, June 17-19, 2026
- Toronto, consensus edition, July 22-24, 2026
- Berlin, payments edition, Oct 1-3, 2026
- Seoul, privacy edition, Nov 5-6, 2026

Sources:

- BTC++ Toronto: https://btcplusplus.dev/conf/toronto
- BTC++ home: https://btcplusplus.dev
- BTC++ GitHub: https://github.com/btcplusplus
- OpenRouter GLM 5.1 model id: `z-ai/glm-5.1`

## Data Reality

- Real data in the public repo: BTC++ event metadata, reviewed public Nostr and
  Apify X signal rows under `data/reviewed/`, a small reviewed trust slice, and
  the public run log under `data/sources/real-data-run-log.json`.
- Synthetic data in the public repo: sample fixtures under `data/samples/` for
  tests and demos.
- Raw real imports: store under `data/real/`. That folder is ignored by git so
  raw public-source pulls do not get published by accident.

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

Open the local URL from `serve` and review the ranked public signals.
The default build targets reviewed real public BTC++ Toronto rows. Use
`npm run build:sample` to rebuild the older synthetic-only console.

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
npm run build
```

Import public signals from CSV or JSON:

```powershell
node dist/cli.js normalize --input leads.csv --out data/samples/normalized.json
```

Search public Nostr relays:

```powershell
node dist/cli.js scan-nostr --query "bitcoin++" --out data/samples/nostr.json
```

Import public Apify X or Reddit rows into ignored `data/real/`:

```powershell
$env:APIFY_TOKEN = "paste-your-apify-token-here"
npm run scan:toronto:apify
npm run scan:toronto:apify:reddit
```

Review a raw public Nostr trust graph into publishable static artifacts:

```powershell
npm run review:nostr-graph
```

That command reads the ignored raw graph from `data/real/`, writes reviewed
signal rows to `data/reviewed/toronto-real-signals.json`, and writes a compact
trust slice to `data/reviewed/toronto-real-trust-slice.json`.

Toronto target notes live in [`docs/TORONTO-TARGET.md`](docs/TORONTO-TARGET.md).
Trust graph notes live in [`docs/TRUST-GRAPH.md`](docs/TRUST-GRAPH.md).
The 3-minute pitch and door-to-door signal-map infographic live in
[`docs/PITCH-3MIN.md`](docs/PITCH-3MIN.md).
The fullscreen 16:10 judge deck lives at
[`outputs/pitch-deck/bitplus-signal-fullscreen-pitch.pptx`](outputs/pitch-deck/bitplus-signal-fullscreen-pitch.pptx),
with slide art direction in [`docs/DECK-PROMPTS.md`](docs/DECK-PROMPTS.md).

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
