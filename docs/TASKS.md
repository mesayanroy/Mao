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
- [ ] 5. Shared: config, providers, `ballot-client`, credential, merkle
- [ ] 6. Server: routes, services, wallet module, store, tests
- [ ] 7. Client: theme, wallet picker, hooks, four pages
- [ ] 8. Docker: Dockerfiles, nginx, compose (dev + prod), verify healthy
- [ ] 9. CI/CD workflows
- [ ] 10. Final pass: typecheck/lint/test/build, docs-match-code check, secret scan

## Future improvements (explicitly out of scope for MVP)

- Multi-sig / DAO-controlled organizer key instead of a single secret commitment.
- SQLite (or Postgres) `PollRepository` implementation behind the existing interface.
- Ranked-choice / quadratic voting circuits.
- Automated recovery UI for "root changed between path fetch and submit" (currently mitigated
  by `HistoricMerkleTree`, but a client-side retry-with-fresh-path UX would help edge cases
  beyond the historic-root window).
