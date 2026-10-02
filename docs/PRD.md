# PRD — Maao

## Problem

Governance votes (DAOs, cooperatives, associations) need three properties simultaneously:
only eligible members can vote, no one can see who voted or how, and anyone can verify the
result was tallied correctly. Show-of-hands and centralized web forms give you at most one of
the three. Maao gives all three using ZK-gated eligibility + on-chain nullifiers +
a publicly verifiable tally.

## Users

| User | Goal |
|---|---|
| Organizer | Create a poll, register eligible members (by commitment, not identity), open/close voting, publish a trustworthy result |
| Voter | Prove membership and cast one vote per poll without revealing who they are or which option they picked |
| Observer / auditor | Verify the tally is internally consistent (tally sum == nullifier count) without trusting the organizer or server |

## Goals

- Eligibility gating via Merkle-tree membership proof, not a public allowlist of identities.
- Ballot secrecy: the chain only ever sees a nullifier and an anonymous tally increment.
- Double-vote prevention via on-chain nullifier set, enforced by the contract, not the server.
- Publicly verifiable tally: anyone can recompute `sum(tally) == |nullifiers|` from chain data.
- Server never sees voter secrets, witnesses, or Merkle paths (see `docs/THREAT_MODEL.md`).

## Non-goals (MVP)

- Sybil resistance of the allowlist itself (who counts as "eligible" is the organizer's
  off-chain problem — this system enforces *one vote per registered commitment*, not
  *one vote per human*).
- Vote delegation, ranked-choice, or quadratic voting — single-choice among up to 4 options only.
- Mainnet-hardened key management for the organizer or sponsor wallet (dev-grade seed handling
  documented, production hardening flagged in `docs/DEPLOYMENT.md`).

## User stories

- As an organizer, I connect my wallet, deploy a poll with a title and up to 4 option labels,
  and get back a contract address.
- As an organizer, I register a voter by pasting a commitment they send me out-of-band; the
  chain only stores the commitment inside the Merkle tree, never who it belongs to.
- As an organizer, I open voting, then close it once turnout is sufficient.
- As a voter, I generate a credential (a random secret) in my browser, receive a registration
  confirmation once my commitment is on-chain, and cast a vote by proving membership — my
  wallet does the proving locally.
- As a voter, I cannot vote twice: my second attempt is rejected by the contract because my
  nullifier is already in the set — with no way for anyone to tell it was *my* second attempt.
- As an observer, I open the Results page (no wallet needed) and see the tally plus enough
  public data (nullifier count, Merkle root) to independently verify it.

## Acceptance criteria (MVP)

- [ ] `ballot.compact` compiles and its vitest suite covers: one-vote-per-credential,
      non-member rejection, phase-gating, organizer-only transitions, tally-sum invariant,
      option-index bounds.
- [ ] Organizer flow works end-to-end against `undeployed` local network: deploy → register →
      open → close.
- [ ] Voter flow works end-to-end: generate credential → wait for registration → cast vote →
      see nullifier accepted, second attempt rejected.
- [ ] Results page renders live tally + Merkle root from indexer data with no wallet connected.
- [ ] `docker compose up --build` brings `proof-server`, `server`, `client` to healthy.
- [ ] Server logs, responses, and stored poll metadata contain zero voter secrets/witnesses.

## Out of scope for this repo's CI

Deploying to `preprod`/`mainnet` is a manual, funded operation (see `docs/DEPLOYMENT.md`); CI
only compiles, tests, and builds — it never needs a funded wallet or live network.
