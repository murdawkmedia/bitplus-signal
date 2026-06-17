# Safety Policy

Bitplus Signal is for finding public community conversations where a conference may
be relevant. It is not a spam engine.

## Allowed

- Public posts, public Nostr notes, public issue threads, public event/community pages.
- Human-reviewed public reply drafts.
- Topic and travel scoring that is explainable from public context.

## Blocked

- Private DMs.
- Private or login-gated groups.
- Automated posting, replying, following, liking, or form submission.
- Contact scraping or private-person dossiers.
- Unreviewed rate, ticket, travel, visa, or sponsorship claims.

## Default Gate

Rows with `visibility` set to `private`, `dm`, or `login_gated` are blocked. Blocked
rows may be used only as aggregate content inspiration; they never receive a draft.
