# Threat Model

## Assets

- Voter identity ↔ vote choice linkage (must never be derivable).
- Voter identity ↔ commitment linkage (must never be derivable by anyone but the voter).
- Integrity of the tally (must equal the number of valid, unique casts).
- Organizer's ability to gate who registers.

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| **Double voting** | On-chain `nullifiers: Set<Bytes<32>>`, checked and inserted atomically inside `castVote`. Nullifier is deterministic per `(secret, pollId)`, so a second attempt with the same credential always produces the same nullifier and is rejected by the contract itself — not by server bookkeeping. |
| **Replay across polls** | Nullifier includes `pollId` in its hash preimage, so the same voter secret produces an unlinkable nullifier per poll. |
| **Allowlist leak (who is eligible)** | Only *commitments* (hashes) are public, via `voters` tree and `GET /polls/:id/commitments`. The mapping from a commitment back to a real identity exists only between the voter and whoever registered them out-of-band — never on-chain or on the server. |
| **Vote–voter linkage via Merkle path reuse bug** | `castVote` asserts `path.leaf == recomputed commitment` before `checkRoot` — this is the exact class of bug found and fixed in the official `midnight-expert` `PrivateVoting.compact` example (see `docs/DECISIONS.md`); without this bind, any registered member's path would satisfy any caller's proof, which is a soundness gap, not a secrecy one, but is tested for explicitly. |
| **Timing / metadata correlation** | Casting a vote is a single transaction indistinguishable on-chain from any other `castVote` call — no separate "register→vote" transaction pair is publicly linkable because registration (organizer-submitted) and voting (voter-submitted) are different transactions signed by different, unrelated keys. Client should avoid casting immediately after registration confirmation is shown to reduce timing correlation by an observer watching mempool order; documented as a UX recommendation, not enforced by the contract. |
| **Proof-server exposure** | The proof server sees private witness inputs (secret, Merkle path) for whatever transaction it proves. The browser client **only** uses the connected wallet's own local proof server via the DApp Connector's `getProvingProvider` — this repo's `docker-compose` proof-server is for local Node-side organizer tooling only (which never handles voter secrets) and is never referenced by client code. Docs explicitly warn against pointing users at a shared/remote proof server (see `docs/DECISIONS.md`). |
| **Sponsor (DUST) abuse** | `POST /polls/:id/sponsor` only balances DUST fee inputs on an already-finalized, user-proven transaction (`balanceFinalizedTransaction({ tokenKindsToBalance: ['dust'] })`) — it cannot alter the proven circuit inputs, cannot see voter secrets, and is rate-limited per `SPONSOR_RATE_LIMIT_PER_MINUTE`. Disabled by default (`SPONSOR_ENABLED=false`). |
| **Server compromise** | Server holds no voter identity data, no voter secrets, and no private state. Worst case from a full server compromise: poll metadata (titles/labels) and the same public commitment/nullifier/tally data already on-chain via the indexer. Confirmed by code review checklist in `docs/DEVELOPMENT.md`. |
| **Organizer key compromise** | Organizer authority is a single `persistentHash` commitment checked per-circuit (same pattern as the official bboard example's `owner` check) — compromise lets an attacker register bogus voters or open/close phases early, but cannot forge votes or alter the nullifier/tally invariants. Out of scope: multi-sig organizer control (documented as a future improvement in `docs/TASKS.md`). |
| **Malicious/compromised indexer** | Client and server both treat indexer data as informational for *reads* (poll list, tally display); the only state that matters for a vote's validity is what the contract itself enforces on submission. An indexer that lies about the tally is publicly detectable by anyone re-querying a second, independent indexer or a full node. |

## Non-threats (explicitly out of scope)

- Sybil resistance of *who gets registered* — that's an off-chain organizer process (e.g.
  verifying real-world membership before handing out a registration slot). This system
  guarantees "one vote per registered credential," not "one vote per human."
- Coercion resistance / receipt-freeness beyond standard ZK-vote secrecy — a voter *could*
  prove to a third party how they voted by revealing their secret; the contract doesn't
  prevent voluntary disclosure, only involuntary leakage.
