# Trust-Proximity Scoring

Bitplus Signal ranks public conference-intent signals with a trust-proximity
layer. The score is not a person score. It is an explainable public-context
score for whether a public post appears close to the BTC++ / Bitcoin developer
community.

## Score Shape

Generated rows include:

- `trustScore`: public graph proximity to seed profiles.
- `conferenceAffinityScore`: public evidence of adjacent conference interest.
- `trustReasons`: short explanations shown in the console drawer.

The total score breakdown uses:

- `T`: topic fit.
- `R`: travel fit.
- `F`: freshness.
- `E`: public reach/provenance.
- `W`: web-of-trust proximity.
- `C`: similar-conference affinity.
- `B`: safety/gate penalty.

## Public Seed Graph

The checked-in seed graph is `data/trust/toronto-trust-seeds.json`. It contains:

- BTC++ seed profiles across Nostr/X/GitHub.
- Synthetic demo profiles.
- Similar conference nodes such as BTC Prague, TABConf, Bitcoin++, Toronto
  Bitcoin Meetups, and adjacent developer events.
- A separate reviewed real public slice lives at
  `data/reviewed/toronto-real-trust-slice.json`.

Do not commit raw collected profile graphs. Keep them under ignored `data/real/`
and publish only a compact reviewed slice.

## Nostr Graph Imports

Nostr is the preferred first graph source because public kind-3 follow lists are
portable and inspectable.

```powershell
npx tsx src/cli.ts scan-nostr-graph `
  --seed <hex-pubkey> `
  --out data/real/nostr-trust-graph.json
```

Then review the raw graph into publishable artifacts:

```powershell
npm run review:nostr-graph
```

Then build with the seed graph and reviewed slice:

```powershell
npm run build
```

## X, Instagram, Facebook, Reddit, and Apify

Use public/export/API data only. Apify imports are generic and require
`APIFY_TOKEN` in the shell environment:

```powershell
npm run scan:toronto:apify
```

The output path is `data/real/apify-toronto.json`, which is ignored by git.

## OpenRouter Models

OpenRouter is optional. The default model is `z-ai/glm-5.1`, with
`moonshotai/kimi-k2.6`, `z-ai/glm-5.2`, and `z-ai/glm-5-turbo` documented as
open-model alternatives.

```powershell
npm run models:check
```

Draft generation still requires human review and does not post anything.
