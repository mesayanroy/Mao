# managed/

Compiled ZK artifacts (`compiler/`, `contract/`, `keys/`, `zkir/`) produced by `compactc` from
`src/ballot.compact`. Gitignored — never commit these, they're regenerated deterministically
from source.

Regenerate with:

```bash
npm run bootstrap          # once, fetches the compiler (see docs/DECISIONS.md)
npm run compile:contracts  # any time ballot.compact changes
```

`packages/client`'s build copies `managed/ballot/keys` and `managed/ballot/zkir` into
`packages/client/public/zk/` so the browser can fetch them at runtime via
`FetchZkConfigProvider`. `packages/shared/src/ballot-client.ts` imports the generated
`contract/index.cjs` module (the compiled `Contract` class + `Ledger` type + `ledger()` decode
function) directly from this directory.
