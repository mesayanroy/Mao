# Decisions & Version Pins

Research date: 2026-09-22. Sources: docs.midnight.network (fetched directly), official
`midnightntwrk/midnight-expert` GitHub issues/PRs (fetched), and web search results quoting
docs.midnight.network / dev.to Midnight-team content. Where a fact could not be fetched
verbatim from an official page, it is marked **[inferred]** with its source.

## Version pins (support matrix, docs.midnight.network/relnotes/support-matrix)

| Component | Version |
|---|---|
| Midnight node | 1.0.2 |
| Compact toolchain (compiler) | 0.31.1 |
| Compact devtools | 0.5.1 |
| Compact runtime (`compact-runtime`) | 0.16.0 |
| Compact JS | 2.5.1 |
| Platform JS | 2.2.4 |
| Midnight.js | 4.1.1 |
| testkit-js | 4.1.1 |
| Wallet SDK | 1.2.0 |
| DApp Connector API | 4.0.1 |
| On-chain runtime (ledger) | 3.0.0 |
| Ledger API package (`@midnight-ntwrk/ledger-v8`) | 8.0.3 |
| Proof server | 8.1.0 |
| Indexer (preview) | 4.3.5 |
| Indexer (preprod / mainnet) | 4.3.3-hotfix |

Node.js: 22.17.1+ (from midnight-docs repo requirements). Docker + Docker Compose v2: required
for `proof-server` and local `undeployed` network.

Package.json dependency versions are pinned to caret ranges anchored on the *actual latest npm
publish* of each package (checked directly against the registry, not the matrix's rounder
numbers, which run behind — e.g. matrix says ledger-v8 `8.0.3`, npm's latest is `8.1.2`; matrix
says Wallet SDK `1.2.0`, but that's the barrel package's own version — each wallet-sdk-* sub-
package has its own independent semver, e.g. `wallet-sdk-facade@4.1.0`, `wallet-sdk-hd@3.0.3`).
**All workspace packages pin the exact same version of any shared dependency** (especially
`@midnight-ntwrk/ledger-v8` and `@midnight-ntwrk/compact-runtime`) — npm otherwise installs two
physically separate copies for two different semver ranges of the same package, and TypeScript
then treats their same-named exported classes as structurally distinct (a real error hit and
fixed during this build — see the `packages/server` commit). `@midnight-ntwrk/ledger-v8` in
particular is pinned to the **exact** version `8.1.0` (no `^`), not a caret range: the
`wallet-sdk-*` family transitively depends on `^8.1.0` and npm hoists the root copy to the
lowest version satisfying that range (`8.1.0`), while a caret range on `ledger-v8` in `shared`/
`server` themselves lets npm resolve *their* copy to the newest matching patch (`8.1.2`) instead
— two different resolutions for the "same" range, both technically valid semver, both installed
side by side. Exact-pinning forces one copy. This is worth knowing for *any* future dependency
this repo adds that the wallet-sdk-* family also depends on.

## Compact language

- `pragma language_version 0.23;` — the exact value observed in the official bulletin-board
  tutorial contract fetched from docs.midnight.network/tutorials/bboard. Support-matrix's
  "Compact runtime 0.16.0" is a different version track (the npm runtime package, not the
  in-source language pragma), so the tutorial's in-file pragma is the trustworthy source for
  what to write in `.compact` files.
- Module: `pragma language_version 0.23; import CompactStandardLibrary;` then `export ledger`,
  `witness`, `export circuit` declarations at top level (confirmed:
  docs.midnight.network/develop/reference/compact/lang-ref + bboard tutorial).
- Confirmed stdlib surface used by this project:
  - `Counter`: `.increment(n)`, `.decrement(n)`, `.read()`, `.lessThan(n)` (confirmed via docs
    counter example + search of docs.midnight.network/examples/counter).
  - `Set<T>`: `.insert(x)`, `.member(x): Boolean` (confirmed pattern from multiple Midnight
    Compact example contracts, incl. nullifier-set usage).
  - `HistoricMerkleTree<#depth, T>`: `.insert(leaf)`, `.checkRoot(root)` where `checkRoot`
    accepts **any historic root** the tree has held, not just the current one — this is the
    documented reason to prefer `HistoricMerkleTree` over plain `MerkleTree` for an allowlist
    that keeps growing after voters have already fetched a path (avoids front-running/race
    between "read root" and "submit vote"). Plain `MerkleTree<#depth, T>` only checks the
    current root and was rejected for that reason.
  - `MerkleTreePath<#n, T>`: witness-supplied struct with a `.leaf` field;
    `merkleTreePathRoot<#n, T>(path): MerkleTreeDigest` recomputes the root from a path.
  - **Critical security pattern** (confirmed via `midnightntwrk/midnight-expert` issue #254 and
    PR #255/#239, "bind witness Merkle paths to their leaf in example contracts"): the shipped
    official `PrivateVoting.compact` example had a real soundness bug — it called
    `checkRoot(merkleTreePathRoot(path))` without first asserting `path.leaf == <recomputed
    commitment>`. Because the path is unconstrained witness-supplied ledger state, any member's
    path would satisfy any caller's check. **This project always asserts `path.leaf ==
    commitment` immediately before every `checkRoot` call.**
  - `persistentHash<T>(value): Bytes<32>`, `persistentCommit<T>(value, rand): Bytes<32>`,
    `transientHash<T>(value): Field`, `transientCommit<T>(value, rand): Field` (confirmed,
    docs.midnight.network/compact/standard-library/exports).
  - `disclose(x)` required to move a witness-derived value into a ledger write or circuit
    return value (confirmed, lang-ref).
  - `Maybe<T>` via `none<T>()` / `some<T>(v)` / `.isSome` / `.value` (confirmed, bboard tutorial).
  - `assert(cond, "message")` (confirmed, bboard tutorial and lang-ref example).
- Compact compiler install: this repo uses `@midnight-ntwrk/midnight-js-compact` (the exact
  package the brief names for "compile tooling") as the **primary, verified** install path —
  confirmed by downloading the real published package (`npm pack
  @midnight-ntwrk/midnight-js-compact@4.1.1`) and reading its shipped `README.md` and `.d.ts`
  directly, not by guessing. It ships two bins: `fetch-compactc` (downloads a pinned
  `compactc` version, controlled by `COMPACTC_VERSION` env var or `--version=`, into a
  `managed/<version>/compactc` cache; on macOS/Linux x64/arm64 it fetches a native binary, on
  any other platform — including Windows — it falls back to `COMPACT_DOCKER_IMAGE`, default
  `ghcr.io/midnight-ntwrk/compactc`) and `run-compactc <input-file> <output-dir>` (runs it).
  `scripts/bootstrap.sh` calls these via `npx` after `npm ci` rather than the alternative
  `curl | sh` installer docs.midnight.network's getting-started page also documents — the npm
  route is reproducible, version-pinned via `COMPACTC_VERSION`, and Windows/CI-friendly via its
  Docker fallback, so it's preferred here. Compile invocation produces
  `compiler/ contract/ keys/ zkir/` under the output directory (confirmed via the official
  bboard tutorial's `compact compile src/bboard.compact src/managed/bboard` example, which
  matches `run-compactc`'s own `<input-file> <output-dir>` signature).
- `COMPACTC_VERSION` is pinned to `0.31.1` (support matrix's "Compact toolchain" version) in
  `.env.example` / `packages/contracts/package.json`.

## Package scopes

Per project brief (authoritative, not re-derived): wallet SDK packages are scoped
`@midnightntwrk/wallet-sdk-*` (no hyphen after `@midnightntwrk`); Midnight.js, ledger and
compact-tooling packages are scoped `@midnight-ntwrk/*` (hyphenated). Both were independently
confirmed by fetched docs pages (e.g. `@midnight-ntwrk/midnight-js-network-id`,
`@midnightntwrk/wallet-sdk-facade`).

## Providers (confirmed, docs.midnight.network/sdks/official/midnight-js)

- `setNetworkId` from `@midnight-ntwrk/midnight-js-network-id`.
- `levelPrivateStateProvider({ privateStoragePasswordProvider, accountId })` from
  `@midnight-ntwrk/midnight-js-level-private-state-provider` — AES-256-GCM encrypted local
  storage; never used server-side for voter secrets (server never touches voter private state).
- `indexerPublicDataProvider(queryUrl, subscriptionUrl)` from
  `@midnight-ntwrk/midnight-js-indexer-public-data-provider`.
- ZK config: `@midnight-ntwrk/midnight-js-fetch-zk-config-provider` (browser, HTTP fetch of
  `/zk/...` artifacts) vs. `@midnight-ntwrk/midnight-js-node-zk-config-provider` (Node scripts,
  filesystem).
- `httpClientProofProvider(proofServerUrl, zkConfigProvider)` from
  `@midnight-ntwrk/midnight-js-http-client-proof-provider` — used only by Node CLI scripts
  against a **local** proof server; the browser client instead uses
  `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider`, delegating proof generation to
  the wallet extension's own local proof server so voter secrets never leave the browser/wallet.
- `deployContract` / `findDeployedContract` / `getStates` / `getPublicStates` /
  `getUnshieldedBalances` from `@midnight-ntwrk/midnight-js-contracts`.

## DApp Connector (confirmed, docs.midnight.network/api-reference/dapp-connector)

- Wallets self-register under `window.midnight.<walletId>` (e.g. Lace = `window.midnight.mnLace`).
  Client enumerates `Object.keys(window.midnight ?? {})` rather than hardcoding — any wallet
  (Lace, 1AM, etc.) exposing the same connector surface works.
- Each entry exposes `{ name, icon, apiVersion }` before connecting, then `connect(networkId):
  Promise<ConnectedAPI>`.
- `ConnectedAPI`: `getShieldedBalances/getUnshieldedBalances/getDustBalance`,
  `getShieldedAddresses/getUnshieldedAddress/getDustAddress` (Bech32m), `getConnectionStatus()`
  (verify `networkId` matches expected — used for the "wrong network" UI state),
  `getConfiguration()` (wallet-preferred `indexerUri/indexerWsUri/proverServerUri/
  substrateNodeUri/networkId`), `getProvingProvider(zkConfigProvider)`.

## Headless Wallet SDK (confirmed, docs.midnight.network/sdks/official/wallet-developer-guide)

- HD derivation path `m / 44' / 2400' / account' / role / index` via `@midnightntwrk/wallet-sdk-hd`
  (`HDWallet.fromSeed`, `AccountKey.selectRole(role).deriveKeyAt(index)`). Roles: `NightExternal
  = 0` (unshielded), `Dust = 2`, `Zswap = 3` (shielded).
- `WalletFacade.init({ configuration, shielded, unshielded, dust })` from
  `@midnightntwrk/wallet-sdk-facade`, composing `ShieldedWallet`/`UnshieldedWallet`/`DustWallet`
  from their own packages; `wallet.stop()` must run on process exit (server does this in a
  `SIGINT`/`SIGTERM` handler — see `packages/server/src/wallet/facade.ts`).
- DUST sponsorship: `wallet.balanceFinalizedTransaction(finalizedTx, { shieldedSecretKeys,
  dustSecretKey }, { ttl, tokenKindsToBalance: ['dust'] })` — balances **only** the DUST fee
  inputs on an already user-signed, finalized transaction, then `wallet.submitTransaction(tx)`.
  This is the mechanism behind `POST /api/v1/polls/:id/sponsor`; the server never sees the
  user's shielded/unshielded secret keys or the vote's private witnesses, only the finalized
  (already-proven) transaction bytes.
- Node process must set `globalThis.WebSocket = WebSocket` from the `ws` package before using
  wallet/indexer providers (confirmed by project brief + consistent with indexer using
  GraphQL-WS subscriptions).

## Proof server (confirmed, docs.midnight.network/guides/run-proof-server)

- Image: `midnightntwrk/proof-server`. We pin `midnightntwrk/proof-server:8.1.0` **[inferred
  tag format]** — the matrix page gives version `8.1.0` but the guide page itself only showed
  a `:latest` example via Docker Desktop's UI, not a docker-compose snippet. Pinning to the
  matrix version number as the tag is the standard Docker convention and is safer than
  `:latest` for reproducible CI/prod; documented here as an explicit inference.
- Listens on port `6300` ("this should not be changed" — docs). Receives **private** data
  (witness values, token ownership details) from whichever wallet/client calls it — it does not
  open outbound connections itself. Therefore: our `docker-compose.yml` proof-server is used
  only by server-side Node CLI scripts (deploy/create-poll/register-voter, which only handle
  *public* organizer actions, never voter secrets) and by local dev tooling — it is never
  referenced by the browser client, which instead must delegate proving to the connected
  wallet's own local proof server via `getProvingProvider`. Docs are followed exactly: "never
  point users at a shared remote proof server."

## Networks (confirmed, docs.midnight.network/guides/networks-and-environments)

| Network | Node RPC | Indexer GraphQL | Indexer WS |
|---|---|---|---|
| `undeployed` (local/dev) | `http://localhost:9944` | `http://localhost:8088/api/v4/graphql` | `ws://localhost:8088/api/v4/graphql/ws` |
| `preview` | `https://rpc.preview.midnight.network` | `https://indexer.preview.midnight.network/api/v4/graphql` | (wss analog) |
| `preprod` (target env) | `https://rpc.preprod.midnight.network` | `https://indexer.preprod.midnight.network/api/v4/graphql` | `wss://indexer.preprod.midnight.network/api/v4/graphql/ws` |
| `mainnet` | `https://rpc.mainnet.midnight.network` | `https://indexer.mainnet.midnight.network/api/v4/graphql` | (wss analog) |

`preprod` faucet: https://midnight-tmnight-preprod.nethermind.dev/. `setNetworkId` throws
`Network ID has not been configured` until explicitly called — every entrypoint (server boot,
CLI scripts, client bootstrap) calls it first, from `packages/shared/src/config.ts`.

## Contract design decisions

- Voter tree: `export ledger voters: HistoricMerkleTree<10, Bytes<32>>` — depth 10 supports up
  to 1024 registered voters per poll, matches the brief's "e.g. depth 10", and `HistoricMerkleTree`
  (not `MerkleTree`) so a path computed against an older root remains valid after later
  registrations (no forced re-fetch race for the voter).
- Commitment: voter picks a random secret client-side; `commitment =
  persistentHash<Vector<2,Bytes<32>>>([domainTag("commitment"), secret])`. Only the commitment
  is ever sent to the organizer/server; the secret never leaves the browser/wallet.
- Nullifier: `persistentHash<Vector<3,Bytes<32>>>([domainTag("nullifier"), secret, pollIdBytes])`
  stored in `export ledger nullifiers: Set<Bytes<32>>` — domain-separated per poll so the same
  secret produces unlinkable nullifiers across different polls, and unlinkable to the commitment
  (different domain tag + different hash arity), satisfying "nobody can tell who voted."
  Membership check `assert(!nullifiers.member(nullifier))` before `.insert(nullifier)`.
  `path.leaf == commitment` is asserted before every `checkRoot`, per the security pattern above.
- Tally: 4 explicit `Counter` ledger fields (`tally0..tally3`) rather than an array, since
  Compact ledger declarations are named fields, not indexable arrays of ledger state (confirmed
  by every ledger example fetched — all name fields individually); `castVote` dispatches on the
  disclosed option index via an `if/else if` chain, each branch calling `.increment(1)` on the
  matching counter, keeping `sum(tally0..3) == nullifiers` count trivially true by construction.
- Phase machine: `export enum Phase { Registration, Voting, Closed }` + `export ledger phase:
  Phase;` guarding every circuit with `assert(phase == Phase.X, "...")`, mirroring the
  `State` enum pattern confirmed in the bboard tutorial.
- Organizer authority: `export ledger organizerKey: Bytes<32>` set once in the constructor from
  a disclosed public key commitment; `openVoting`/`closeVoting`/`registerVoter` all assert the
  caller can produce a witness-supplied secret whose `persistentHash` matches `organizerKey`
  (same pattern as bboard's `owner`/`publicKey` check), so only the organizer's wallet can call
  them — no separate "admin" concept needed beyond the pattern the official example already uses.

## Server / infra decisions

- Store: file-backed JSON repository behind a `PollRepository` interface (per brief:
  "interface + simple file/SQLite impl") — chosen over SQLite for the MVP to avoid an extra
  native dependency in the Docker image; interface makes swapping in SQLite later a one-file
  change. Documented as a deliberate MVP simplicity choice, not a guess about Midnight APIs.
- Sponsor route gated by `SPONSOR_ENABLED` env flag per brief; when disabled the route returns
  `501`-style `{ error: { code: 'SPONSOR_DISABLED' } }` rather than being unmounted, so clients
  get a clear typed error instead of a generic 404.

## Verified directly from installed npm packages (not just docs pages)

Network access to `registry.npmjs.org` and Docker Hub was available in the build environment
even though `github.com`/`api.github.com` were not (both confirmed by direct connection tests).
So instead of guessing at TypeScript API shapes from docs summaries, the actual published
packages were downloaded (`npm pack ...@4.1.1`) and their shipped `.d.ts` files read directly
for: `@midnight-ntwrk/compact-runtime` (`createCircuitContext`, `createConstructorContext`,
`WitnessContext<L,PS>`, the generated `Contract` shape, `MerkleTreePath<A> { leaf, path }` —
confirming the `.leaf` field used throughout `ballot.compact`'s security-critical assertions),
`@midnight-ntwrk/midnight-js-contracts` (`deployContract`, `findDeployedContract`, `getStates`,
`getPublicStates`, `getUnshieldedBalances` — richer/more precisely typed than the docs summary
suggested, using an `Effect`-based `Contract`/`CompiledContract` generic system that
application code mostly just passes through from the compiled contract module rather than
constructing by hand), `@midnight-ntwrk/midnight-js-types` (`MidnightProviders`,
`PrivateStateProvider`, `ZKConfigProvider`, `PublicDataProvider` full interfaces),
`@midnight-ntwrk/midnight-js-network-id` (`NetworkId` is just `string`),
`@midnight-ntwrk/midnight-js-indexer-public-data-provider` (`indexerPublicDataProvider(queryURL,
subscriptionURL, webSocketImpl?)`), `@midnight-ntwrk/midnight-js-level-private-state-provider`
(`levelPrivateStateProvider(config)`), `@midnight-ntwrk/midnight-js-http-client-proof-provider`
(`httpClientProofProvider(url, zkConfigProvider, config?)`),
`@midnight-ntwrk/midnight-js-fetch-zk-config-provider` (`FetchZkConfigProvider` is a **class**,
`new FetchZkConfigProvider(baseURL, fetchFunc?)` — not a factory function as an earlier docs
summary implied), and `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider`
(`dappConnectorProofProvider(api, zkConfigProvider, costModel): Promise<ProofProvider>`).

## Inferred (not directly confirmed): HistoricMerkleTree ledger field shape

The generated `Ledger` type's collection-field convention was confirmed for `Map`/`Set` (both
expose `isEmpty()/size()/member()/[Symbol.iterator]()`, confirmed by downloading the real
compiled `@midnight-ntwrk/midnight-did-contract` package — see above). No published contract
package inspected in this session uses a `MerkleTree`/`HistoricMerkleTree` ledger field, so its
exact generated shape (does it expose `[Symbol.iterator]()` over leaves? a `.root()` accessor?)
is *inferred by analogy* to the Map/Set convention, not independently confirmed. `packages/
server/src/services/indexer.service.ts`'s `getCommitments` assumes `ledger.voters` is iterable
in insertion order. To avoid depending on an unconfirmed `.root()` shape at all, the public
Merkle root shown in `GET /api/v1/polls/:id/tally` is instead recomputed server-side from that
same commitment list via `computeVotersRoot` in `packages/shared/src/merkle.ts`, using only the
already-confirmed `StateBoundedMerkleTree`/`CompactTypeField` primitives — so at most one line
(`for (const leaf of ledger.voters)`) needs adjusting after a real compile, not the whole
tally/commitments read path.

## Real bugs found and fixed by actually running the build/tests

Genuine `npm run typecheck`, `npm test`, and `npx vite build` runs in this sandbox (against real
installed packages) surfaced and fixed several bugs no amount of docs-reading would have caught:

- **Fastify v5 logger option**: `Fastify({ logger: pinoInstance })` throws `"logger options only
  accepts a configuration object"` — a pre-built pino instance must be passed as `loggerInstance`
  instead. Caught by running `packages/server`'s vitest suite for real.
- **`@midnight-ntwrk/ledger-v8` duplicate installs**: see "Version pins" above — must be pinned to
  the exact same version (`8.1.0`, no caret) in every workspace package or npm installs two
  physically separate, TypeScript-incompatible copies. Caught by `tsc` on `packages/server`.
- **`isomorphic-ws` named import shape**: `indexerPublicDataProvider`'s `webSocketImpl` param is
  typed `typeof ws.WebSocket` where `ws = import * as ws from 'isomorphic-ws'` (its own `export =
  require('ws')` re-export) — not a default export, not the plain `ws` package. Caught by `tsc`
  on `packages/shared`.
- **`packages/shared`'s barrel leaked Node-only code into the browser bundle**: `providers.ts`
  (uses `ws`/`isomorphic-ws`, Node's `fs`/`path` via the level/node-zk-config providers) was
  re-exported from `shared`'s main `index.ts`, so `packages/client` — which only needs
  `config`/`credential`/`merkle`/`ballot-client` — transitively pulled it into the Vite bundle.
  `isomorphic-ws`'s *browser* build doesn't export a `WebSocket` binding, so `vite build` failed
  with `"WebSocket" is not exported by ".../isomorphic-ws/browser.js"`. Fixed by moving
  `providers.ts` out of the main export and exposing it only via the subpath
  `@midnight-ballot/shared/providers` (added to `package.json`'s `exports` map) — server and CLI
  scripts import that subpath directly; the client never touches it. Caught by an actual `npx
  vite build`, not typecheck (Node built-ins get silently externalized by Vite with a warning,
  not an error — only the named-export mismatch failed the build).
- **`@midnight-ntwrk/ledger-v8`'s WASM module needs `vite-plugin-wasm`**: it ships a WASM module
  using the "ESM integration proposal for Wasm," which Vite/Rollup can't load out of the box
  (`vite build` failed with `"ESM integration proposal for Wasm" is not supported`). Fixed by
  adding `vite-plugin-wasm` and `build.target: 'esnext'` to `packages/client/vite.config.ts`.
  `vite-plugin-top-level-await` was tried alongside it (a common pairing for this exact problem)
  but its Rollup output step crashed on this specific dependency tree (`missing field 'type'`
  inside its SWC-based codegen) — dropped it once a real build showed `esnext` alone was enough
  (top-level await is native to esnext output, so the plugin was redundant here anyway).
- **Two files imported `createBallotPrivateState`/`BallotPrivateState` from
  `@midnight-ballot/shared`**: that type/function actually lives in `@midnight-ballot/contracts`
  (`witnesses.ts`), re-exported via its own `index.ts` — `shared` never re-exported it. Caught by
  `tsc` on `packages/client` (`scripts/deploy-contract.ts` and `register-voter.ts` had the same
  bug, found by grepping for the same import once the client error surfaced).
- The real `@midnight-ntwrk/dapp-connector-api` package (confirmed by downloading it) declares
  `window.midnight` itself and has a materially richer API than the docs summary implied:
  `getDustBalance()` returns `{ cap, balance }` not a plain `bigint`; `getUnshieldedAddress()`
  returns `{ unshieldedAddress }` not a plain string; `getConnectionStatus()` returns a tagged
  union (`{status:'connected', networkId} | {status:'disconnected'}`), not an object that always
  has `networkId`. `packages/client/src/hooks/useWallet.ts` was rewritten against these real
  types instead of the hand-rolled approximation from the first pass.

## Open items / unverified at build time

- The build environment has npm-registry and Docker Hub access but **no access to
  `github.com`/`api.github.com`** (confirmed: `curl` to both hangs/refuses). Since
  `fetch-compactc` downloads the actual `compactc` binary from a GitHub release, **the Compact
  compiler could not actually be fetched or run in this environment**, so `ballot.compact` was
  never compiled here and `packages/contracts/managed/` was never generated or exercised.
  `npm run compile:contracts` must be run for the first time on a machine with GitHub access
  (any normal dev machine/CI runner) before `npm run test:contracts` or `npm run build` will
  pass. Everything in `ballot.compact`, `witnesses.ts`, and the vitest suite is written against
  the real, verified stdlib/runtime APIs above; only the actual compiler invocation is unverified.
- Live `docker compose up` against the real `midnightntwrk/proof-server:8.1.0` image and a real
  `preprod` deployment were not exercised for the same reason the compiler couldn't run (no
  compiled contract to deploy); Docker Hub itself is reachable and the server/client images do
  build and run in this environment (see `docs/TASKS.md` for what was actually verified vs. not).
  Flagged again in `CONTEXT.md`.
