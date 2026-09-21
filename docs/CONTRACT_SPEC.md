# Contract Spec — `ballot.compact`

Full API reference for the contract in `packages/contracts/src/ballot.compact`. See
`docs/DECISIONS.md` for the sourced Compact stdlib facts this design relies on.

## Ledger state

| Field | Type | Notes |
|---|---|---|
| `organizerKey` | `Bytes<32>` | `persistentHash` commitment to the organizer's local secret key. Set once in the constructor. |
| `pollId` | `Bytes<32>` | Domain-separation tag for nullifiers, set once in the constructor. |
| `phase` | `Phase` (enum: `Registration`, `Voting`, `Closed`) | Guards every circuit. |
| `voters` | `HistoricMerkleTree<10, Bytes<32>>` | Leaves are voter commitments. `HistoricMerkleTree` (not plain `MerkleTree`) so a path proven against an older root stays valid after later registrations — see `docs/DECISIONS.md`. |
| `nullifiers` | `Set<Bytes<32>>` | One entry per vote cast. Membership = "this credential already voted." |
| `optionCount` | `Uint<2..4>` | Number of valid options, set in the constructor. The `2..4` range is compiler-enforced — no runtime bounds assert needed. |
| `tally0..tally3` | `Counter` × 4 | Per-option vote counts. Ledger fields are named, not array-indexed (see DECISIONS.md), so each option gets its own field; unused options (index ≥ `optionCount`) simply stay at 0. |

## Circuits

### `constructor(organizerKeyCommitment: Bytes<32>, pollIdSeed: Bytes<32>, initialOptionCount: Uint<2..4>)`

Initializes `organizerKey`, `pollId`, `optionCount`, `phase = Registration`, empty `voters`
tree, empty `nullifiers` set, all tallies at 0. The `2..4` bound on the parameter type means an
out-of-range value is a compile/encoding-time error for the caller, not a runtime assert.

### `registerVoter(commitment: Bytes<32>)` — organizer only, `Registration` phase

- **Purpose**: add one eligible voter's commitment to the allowlist tree.
- **Auth**: witness `organizerSecretKey()` must hash to `organizerKey`.
- **Privacy**: `commitment` is already a hiding hash of the voter's secret — this circuit
  discloses only the commitment, never a real-world identity.
- **Effect**: `voters.insert(disclose(commitment))`.
- **Failure modes**: wrong phase; caller isn't the organizer.

### `openVoting()` — organizer only, `Registration` phase

Transitions `phase = Voting`. No further `registerVoter` calls are possible once open — the
allowlist is frozen for the duration of the poll (keeps the eligible set well-defined for
auditors; re-open would need a new poll).

### `closeVoting()` — organizer only, `Voting` phase

Transitions `phase = Closed`. Tallies become final and public.

### `castVote(option: Uint<0..3>, path: MerkleTreePath<10, Bytes<32>>)` — `Voting` phase

- **Witnesses used**: `voterSecret()` (the voter's local secret), the `path` argument itself
  is witness-supplied by the caller (client rebuilds it locally from public commitments —
  see `docs/API.md` `/polls/:id/commitments`).
- **Steps**:
  1. `assert(phase == Phase.Voting, ...)`.
  2. `assert(option < optionCount, "invalid option")`.
  3. Recompute `commitment = persistentHash<Vector<2,Bytes<32>>>([domainTag("commitment"), voterSecret()])`.
  4. **Bind the path to the leaf being checked** (the exact bug found in the official
     `PrivateVoting.compact` example, see DECISIONS.md): `assert(path.leaf == commitment,
     "path does not match commitment")`.
  5. `assert(voters.checkRoot(merkleTreePathRoot(path)), "not a registered voter")`.
  6. Compute `nullifier = persistentHash<Vector<3,Bytes<32>>>([domainTag("nullifier"),
     voterSecret(), pollId])`.
  7. `assert(!nullifiers.member(nullifier), "already voted")`.
  8. `nullifiers.insert(disclose(nullifier))`.
  9. Dispatch on `option` (`if/else if` chain) and `.increment(1)` the matching `tallyN`.
- **Disclosed on-chain**: only the nullifier and the incremented counter. The commitment,
  secret, and Merkle path are never written to the ledger — they exist purely inside the
  circuit's witness/private inputs for this one proof.
- **Failure modes**: wrong phase, invalid option index, path doesn't match the recomputed
  commitment, commitment not a member of `voters`, nullifier already used.

## Witnesses (`packages/contracts/src/witnesses.ts`)

| Witness | Returns | Source |
|---|---|---|
| `voterSecret()` | `Bytes<32>` | From the voter's local private state (generated once client-side, persisted in the wallet's encrypted local storage — never sent to the server). |
| `organizerSecretKey()` | `Bytes<32>` | From the organizer's local private state, same pattern. |

Both are pure lookups into `PrivateState` (see `docs/WALLET_INTEGRATION.md`) — no I/O, no
network calls, matching the "witnesses receive untrusted input, no implementation in Compact
itself" model from the language reference.

## Invariants (tested in `packages/contracts/test/`)

| Invariant | Test |
|---|---|
| One vote per credential | Second `castVote` with the same secret is rejected (nullifier reused). |
| Non-members rejected | `castVote` with a path/secret not in `voters` fails `checkRoot`. |
| Path-leaf binding | A *different* registered member's valid path cannot be reused to vote as another commitment (regression test for the DECISIONS.md-documented bug class). |
| No votes outside `Voting` | `castVote` during `Registration` or `Closed` fails. |
| Organizer-only transitions | `registerVoter`/`openVoting`/`closeVoting` fail for a non-organizer witness. |
| Tally/nullifier consistency | After N successful votes, `tally0+tally1+tally2+tally3 == N == |nullifiers|`. |
| Option bounds | `castVote` with `option >= optionCount` fails. |
