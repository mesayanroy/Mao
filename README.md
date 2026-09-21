# Midnight Ballot

Private, eligibility-gated voting with publicly verifiable tallies — built on
[Midnight Network](https://midnight.network). Only allowlisted members can vote, nobody can
tell who voted or how, anyone can verify the tally, and on-chain nullifiers block double
voting.

Read `docs/CONTEXT.md` for the full single-file project digest, or `docs/PRD.md` /
`docs/ARCHITECTURE.md` / `docs/CONTRACT_SPEC.md` for the specifics.

## Quickstart

```bash
npm run bootstrap        # verifies Node 22+/Docker, installs the Compact compiler, npm ci, seeds .env
npm run docker:up        # proof-server + server + client (local `undeployed` network)
```

In another terminal, as the organizer:

```bash
npm run deploy:contract  # deploys ballot.compact, prints the contract address
npm run create:poll      # registers poll title/options/address with the server
npm run register:voter   # adds a voter commitment to the on-chain allowlist
```

Then open the client (printed by `docker:up`, default `http://localhost:5173`), connect a
wallet exposing the [DApp Connector](docs/WALLET_INTEGRATION.md) API (e.g. Lace), and:

## 2-minute demo script

1. **Organizer** (Organizer page): connect wallet → create a poll ("Approve Q3 budget",
   options Yes/No/Abstain) → deploy → copy the contract address (or use the CLI above).
2. **Voter A** (Vote page): generate a credential (a secret stored only in your browser) →
   send the printed commitment to the organizer out-of-band → wait for registration →
   once the organizer opens voting, pick an option → cast.
3. **Organizer**: open voting, later close it once turnout is sufficient.
4. **Anyone** (Results page, no wallet needed): watch the tally update live; verify
   `totalVotes == nullifierCount` yourself from the same public data.
5. Try voting twice with Voter A's credential — the second attempt is rejected by the contract,
   not by the app.

## Why it's private

- Only a hash of each voter's secret (their "commitment") ever touches the chain — see
  `docs/CONTRACT_SPEC.md`.
- Proving happens in your wallet, not on our server — see `docs/WALLET_INTEGRATION.md` and
  `docs/THREAT_MODEL.md`.
- The tally is derived entirely from public chain data; verify it yourself, don't trust us.

## Repo layout

```
packages/contracts   Compact smart contract + tests   (most important part)
packages/server      Fastify API: metadata, reads, optional DUST sponsorship
packages/client      Vite + React UI, black/white, wallet connect
packages/shared      config, schemas, providers, contract client — used by both
scripts/             bootstrap + CLI (deploy, create-poll, register-voter, read-tally)
docs/                PRD, architecture, contract spec, API, threat model, deployment, ...
```

## Development

See `docs/DEVELOPMENT.md` for the day-to-day command table, and `CLAUDE.md` for the
no-guessing rule this codebase was built under (every non-obvious external fact is sourced in
`docs/DECISIONS.md`).
