# Tasks

Tracks build progress against the execution plan. Update as phases complete.

- [x] 1. Research Midnight APIs, pin versions → `docs/DECISIONS.md`
- [x] 2. Scaffold monorepo, configs, bootstrap script, `CLAUDE.md`
- [x] 3. Write docs (PRD → CONTEXT.md)
- [ ] 4. Contracts: `ballot.compact` + `witnesses.ts` + vitest suite, compiling green
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
