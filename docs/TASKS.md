# Tasks

Tracks build progress against the execution plan. Update as phases complete.

- [x] 1. Research Midnight APIs, pin versions → `docs/DECISIONS.md`
- [x] 2. Scaffold monorepo, configs, bootstrap script, `CLAUDE.md`
- [x] 3. Write docs (PRD → CONTEXT.md)
- [x] 4. Contracts: `ballot.compact` + `witnesses.ts` + vitest suite written and typechecked
      against real installed `@midnight-ntwrk/compact-runtime` types (verified via `npm pack`
      + `tsc`, see docs/DECISIONS.md). **Not yet compiled/run** — this sandbox has no GitHub
      access, which `fetch-compactc` needs; run `npm run compile:contracts && npm run
      test:contracts` on a normal dev machine/CI runner before trusting it green.
- [x] 5. Shared: config, providers, `ballot-client`, credential, merkle — `npm run typecheck -w
      packages/shared` passes clean against real installed deps (`config.ts`, `types.ts`,
      `schemas.ts`, `merkle.ts`, `providers.ts`, `credential.ts`, `index.ts` fully verified;
      `ballot-client.ts`'s `CompiledContract.make(...)` call has two documented `as never`
      escapes — see its file header and docs/DECISIONS.md)
- [x] 6. Server: routes, services, wallet module, store, tests — **actually executed** with
      `npm test` (8/8 passing, real Fastify `.inject()` HTTP tests) and `npm run typecheck`
      against real installed deps (both verified using a temporary stub for the not-yet-compiled
      `@midnight-ballot/contracts` module, deleted afterward — see docs/DECISIONS.md). Caught and
      fixed two real bugs this way: Fastify v5 needs `loggerInstance` (not `logger`) to accept a
      pre-built pino instance, and `@midnight-ntwrk/ledger-v8` needs an *exact* version pin across
      workspaces or npm installs duplicate, type-incompatible copies.
- [x] 7. Client: theme, wallet picker, hooks, four pages — **actually built** with a real `npx
      vite build` (not just typechecked) against real installed deps, using a temporary stub for
      the not-yet-compiled `@midnight-ballot/contracts` module (deleted afterward). Caught and
      fixed three real bugs this way: `packages/shared`'s barrel leaked Node-only `providers.ts`
      into the browser bundle (isomorphic-ws browser build breaks on it — moved to a
      `@midnight-ballot/shared/providers` subpath export instead), `@midnight-ntwrk/ledger-v8`'s
      WASM needs `vite-plugin-wasm` + `esnext` build target, and two files imported
      `createBallotPrivateState` from the wrong package. `useWallet.ts` was also rewritten
      against the real `@midnight-ntwrk/dapp-connector-api` package (downloaded and read
      directly) instead of a hand-rolled approximation of `window.midnight`'s shape. See
      docs/DECISIONS.md "Real bugs found and fixed by actually running the build/tests".
- [x] 8. Docker: Dockerfiles, nginx, compose (dev + prod). Verified: `docker compose config`
      (both files, found and fixed a real YAML healthcheck syntax bug) and `docker build --check`
      (both Dockerfiles, clean). **Not verified**: this sandbox's Docker daemon has no network
      access inside build `RUN` steps (confirmed directly), so a full image build / `docker
      compose up --build` bringing all services healthy needs to happen on a normal dev machine
      or CI runner — see docs/DECISIONS.md "Docker verification".
- [x] 9. CI/CD workflows (`ci.yml`: lint/compile/typecheck/test/build/docker-build/secret-scan/
      audit; `cd.yml`: build+push GHCR images on main/tags, optional SSH deploy gated on secrets
      being set; PR template; Dependabot config). Not executable in this sandbox (needs a real
      GitHub Actions runner with GitHub/registry network access, which this sandbox lacks — see
      docs/DECISIONS.md); written directly against the same verified npm scripts
      (`compile:contracts`, `test:contracts`, `test:server`, `build`) already exercised locally.
- [ ] 10. Final pass: typecheck/lint/test/build, docs-match-code check, secret scan

## Future improvements (explicitly out of scope for MVP)

- Multi-sig / DAO-controlled organizer key instead of a single secret commitment.
- SQLite (or Postgres) `PollRepository` implementation behind the existing interface.
- Ranked-choice / quadratic voting circuits.
- Automated recovery UI for "root changed between path fetch and submit" (currently mitigated
  by `HistoricMerkleTree`, but a client-side retry-with-fresh-path UX would help edge cases
  beyond the historic-root window).
