# Development

## Setup

```
npm run bootstrap   # verifies Node 22+/Docker, installs `compact` CLI, npm ci, seeds .env
```

## Layout

See `docs/ARCHITECTURE.md` for the package boundaries. Compiled ZK artifacts are gitignored —
regenerate with `npm run compile:contracts` any time `ballot.compact` changes; the client build
copies `packages/contracts/managed/ballot/*` into `packages/client/public/zk/`.

## Day to day

| Task | Command |
|---|---|
| Compile the contract | `npm run compile:contracts` |
| Run contract tests | `npm run test:contracts` |
| Run server tests | `npm run test:server` |
| Typecheck everything | `npm run typecheck` |
| Lint everything | `npm run lint` |
| Run server in watch mode | `npm run dev:server` |
| Run client dev server | `npm run dev:client` |
| Full local stack | `npm run docker:up` |

## Local network

`docker-compose.yml`'s `proof-server` + an `undeployed` local Midnight network (see
`docs/DECISIONS.md` for endpoints) is what `scripts/deploy-contract.ts` targets by default
(`NETWORK_ID=undeployed` in `.env`). Switch to `preprod` for a public testnet deploy — see
`docs/DEPLOYMENT.md`.

## Adding a new circuit

1. Edit `packages/contracts/src/ballot.compact`, update `docs/CONTRACT_SPEC.md` first (spec
   drives implementation here, not the other way round).
2. Add/extend `packages/contracts/src/witnesses.ts` if it needs new private state.
3. `npm run compile:contracts`, then add a vitest case under `packages/contracts/test/`
   covering both the happy path and the specific failure modes listed in the spec.
4. Regenerate `packages/shared/src/ballot-client.ts`'s circuit wrapper if the signature changed.

## Code review checklist (privacy invariant)

Before merging any change touching `packages/server`: grep the diff for `secret`, `witness`,
`merklePath`, `privateState` — none of those should appear in a server-side file. This is the
one invariant `docs/THREAT_MODEL.md` treats as non-negotiable.
