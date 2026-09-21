## Summary

<!-- What changed and why. Link the relevant doc (docs/CONTRACT_SPEC.md, docs/API.md, ...) if this touches a spec'd surface. -->

## Privacy checklist

- [ ] No voter secret, witness, or Merkle path is read/logged/sent by `packages/server`.
- [ ] Docs updated if this changes a circuit, API route, or deployment step.

## Test plan

- [ ] `npm run typecheck && npm run lint && npm test && npm run build` pass locally.
