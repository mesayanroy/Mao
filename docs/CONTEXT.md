# CONTEXT — Midnight Ballot (single-file digest)

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
| `packages/shared` | config/schemas/providers/`ballot-client` used by server+client | `docs/ARCHITECTURE.md` |
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

All sourced with citations in `docs/DECISIONS.md`: exact package versions (Midnight.js 4.1.1,
Wallet SDK 1.2.0, ledger-v8 8.0.3, proof server 8.1.0, Compact toolchain 0.31.1), package
scopes (`@midnight-ntwrk/*` hyphenated vs `@midnightntwrk/wallet-sdk-*` no-hyphen), the Compact
stdlib surface actually used here (`Counter`, `Set<T>`, `HistoricMerkleTree<N,T>`,
`MerkleTreePath`, `merkleTreePathRoot`, `persistentHash`/`persistentCommit`, `disclose`,
`Maybe`), the Compact compiler install command, and network endpoints per environment.

## Unverified at build time (flagged in DECISIONS.md)

- `@midnight-ntwrk/midnight-js-compact` exact published version wasn't independently confirmed
  (doc access for that one page was intermittent this session); the `compact` CLI is the
  verified, load-bearing compile path everywhere in this repo.
- Live `docker compose up` against real registries/`preprod` wasn't exercised in the build
  environment (no outbound registry access there); compose files follow the documented
  contract and should be validated with real registry access before first production deploy.

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
