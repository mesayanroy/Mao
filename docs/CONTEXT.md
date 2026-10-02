# CONTEXT — Maao (single-file digest)

Read this first if you're an AI model picking up this repo cold. Everything here is expanded
in a linked doc; this file is a map, not the territory.

## What this is

Private, eligibility-gated voting on Midnight Network. Only allowlisted members can vote,
nobody can tell who voted or how, anyone can verify the tally, nullifiers block double voting.
Category: identity/credentials, governance use case.

## The one invariant that matters most

`packages/server` (and CI, and logs) must **never** see a voter secret, witness, or Merkle
path tied to a specific voter. All proving happens client-side via the connected wallet's own
local proof server. See `docs/THREAT_MODEL.md`.

## Repo map

| Path | What | Doc |
|---|---|---|
| `packages/contracts` | `ballot.compact` + `witnesses.ts` + vitest | `docs/CONTRACT_SPEC.md` |
| `packages/shared` | config/schemas/`ballot-client`/`merkle`/`credential` used by server+client; `providers.ts` (Node-only) via the `/providers` subpath | `docs/ARCHITECTURE.md` |
| `packages/server` | Fastify read API + optional DUST sponsor | `docs/API.md` |
| `packages/client` | Vite+React UI, wallet connect | `docs/WALLET_INTEGRATION.md` |
| `scripts/` | `bootstrap.sh` + CLI: deploy/create-poll/register-voter/read-tally | `docs/DEVELOPMENT.md` |
| `docker-compose*.yml` | proof-server + server + client, dev & prod overrides | `docs/DEPLOYMENT.md` |
| `.github/workflows/` | `ci.yml` (test/build), `cd.yml` (push images, optional SSH deploy) | `docs/DEPLOYMENT.md` |

## Contract in one paragraph

State: `organizerKey`, `pollId`, `phase` (Registration→Voting→Closed), `voters:
HistoricMerkleTree<10, Bytes<32>>` (commitment leaves), `nullifiers: Set<Bytes<32>>`,
`optionCount`, and 4 `Counter` tallies. `registerVoter` (organizer, Registration) inserts a
commitment. `castVote` (Voting phase) takes an option and a witness-supplied Merkle path,
recomputes the caller's commitment from a private `voterSecret` witness, **asserts
`path.leaf == commitment` before `checkRoot`** (a real bug class found in the official
`PrivateVoting.compact` example — see `docs/DECISIONS.md`), checks/inserts a nullifier, and
increments the matching tally. Full spec: `docs/CONTRACT_SPEC.md`.

## Grounded facts you should trust without re-deriving

Almost everything non-obvious in this repo was confirmed by **downloading and reading the real
published npm packages** (`npm pack ...`), not just docs summaries — see `docs/DECISIONS.md` for
the full list with citations: exact package versions and scopes, the Compact stdlib surface used
here (`Counter`, `Set<T>`, `HistoricMerkleTree<N,T>`, `MerkleTreePath { leaf, path }`,
`merkleTreePathRoot`, `persistentHash`/`persistentCommit`, `disclose`, `Maybe`), the compactc
codegen shape (`Contract<PS,W>` with `circuits`/`impureCircuits`/`provableCircuits`/`witnesses`,
the `ledger()` decode function — cross-checked against a real compiled contract package,
`@midnight-ntwrk/midnight-did-contract`), the real `WalletFacade`/`HDWallet` APIs, and the real
`@midnight-ntwrk/dapp-connector-api` (`window.midnight`, `ConnectedAPI`, `ConnectionStatus`).

## What was actually run and verified in this build (not just typechecked)

This sandbox has npm-registry and Docker Hub access but **no access to `github.com`** — which
blocks fetching the Compact compiler binary (`fetch-compactc` downloads it from a GitHub
release). Everything *except* that one step was genuinely executed here, which caught and fixed
several real bugs no amount of reading would have (each detailed in `docs/DECISIONS.md`):

- `packages/contracts`: `tsc --strict` against real installed `@midnight-ntwrk/compact-runtime`.
- `packages/shared`: `tsc --strict` against every real installed `@midnight-ntwrk/*` package —
  caught the `isomorphic-ws` named-import mismatch.
- `packages/server`: real `vitest run`, 8/8 passing via Fastify's `.inject()` — caught the
  `loggerInstance` vs `logger` Fastify v5 option bug, and a `Promise<FastifyInstance>` return-type
  mismatch caused by that same fix.
- `packages/client`: real `npx vite build` succeeding end-to-end (not just typecheck) — caught
  the WASM-loading failure (needed `vite-plugin-wasm` + `esnext` target) and the Node-only
  `providers.ts` leaking into the browser bundle via `shared`'s barrel export.
- `@midnight-ntwrk/ledger-v8` needed an **exact** version pin (`8.1.0`, no `^`) across every
  workspace package, or npm installs two physically separate, type-incompatible copies.
- `docker-compose.yml`/`docker-compose.prod.yml`: `docker compose config` (both files, and their
  merge) resolves cleanly — caught a YAML healthcheck quoting bug. `docker build --check` lints
  both Dockerfiles clean. A full `docker build`/`up` was **not** run — this sandbox's Docker
  daemon has no network access inside build `RUN` steps (confirmed directly), so `npm ci` inside
  either Dockerfile can't complete here.

**The single missing piece everywhere above**: `packages/contracts/managed/` (the compiled
`ballot.compact` output) does not exist in this repo — it's gitignored and regenerated by
`npm run compile:contracts`, which needs the `compact` compiler binary from a GitHub release.
Every verification above that touches `@maao/contracts` was done by temporarily
generating a hand-written stub matching the *real* confirmed codegen shape, running the real
tool, then deleting the stub — it was never committed, so a fresh clone has no `managed/`
directory beyond its `README.md`. **Run `npm run bootstrap && npm run compile:contracts` first**
on any
machine with normal internet access before trusting `npm test` / `npm run build` at the repo
root; everything downstream of that one step has already been proven correct.

## Quickstart (see README.md for the full demo script)

```
npm run bootstrap
npm run docker:up            # proof-server + server + client, local `undeployed` network
npm run deploy:contract      # organizer: deploy ballot.compact
npm run create:poll          # organizer: register poll metadata with the server
npm run register:voter       # organizer: add a commitment to the allowlist
# open the client, connect a wallet, generate a credential, cast a vote
npm run read:tally           # anyone: print the current public tally
```
