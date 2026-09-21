# Architecture

## Three parts

```
packages/
├── contracts/   Compact contract + witnesses + vitest suite (source of truth for on-chain rules)
├── shared/      chain config, zod schemas, providers, ballot-client — imported by server & client
├── server/      Fastify API: poll metadata, read-only indexer queries, optional DUST sponsorship
└── client/      Vite+React UI: wallet connect, organizer/voter/results pages
```

Boundary rule: `server` never imports a voter secret or witness; all proving happens in
`client` via the connected wallet. `shared` has no server- or browser-only code — it's plain
TS + the generated contract types.

## Data flow

```mermaid
flowchart LR
  subgraph Browser [Client]
    W[Wallet DApp Connector] --> C[ballot-client]
  end
  subgraph Chain
    K[ballot.compact contract]
    IDX[Indexer]
  end
  S[Server API]
  C -- proven tx --> K
  K -- events/state --> IDX
  IDX -- public reads --> S
  IDX -- public reads --> C
  S -- poll metadata, tally, commitments --> C
```

The server is a read-only convenience layer over the indexer plus a small off-chain metadata
store (poll titles/options); it never mediates a write to the contract except optionally
adding DUST fee inputs to an already-proven tx (sponsorship).

## Sequence: register a voter

```mermaid
sequenceDiagram
  participant V as Voter (browser)
  participant O as Organizer (browser)
  participant K as Contract
  V->>V: generate secret, compute commitment = hash(secret)
  V-->>O: send commitment (out-of-band, e.g. email/chat)
  O->>K: registerVoter(commitment)  [wallet-signed, organizer key proof]
  K->>K: voters.insert(commitment)
  Note over K: only the commitment is ever on-chain
```

## Sequence: cast a vote

```mermaid
sequenceDiagram
  participant V as Voter (browser)
  participant Server as Server API
  participant Wallet as Connected wallet (local proof server)
  participant K as Contract
  V->>Server: GET /polls/:id/commitments
  V->>V: rebuild Merkle tree locally, compute path for own commitment
  V->>Wallet: castVote(option, path) with local witness (secret)
  Wallet->>Wallet: prove circuit locally (secret never leaves device)
  Wallet->>K: submit proven tx
  K->>K: assert path.leaf==commitment, checkRoot, nullifier unused, insert, increment tally
```

## Sequence: read the tally

```mermaid
sequenceDiagram
  participant Anyone as Observer (no wallet)
  participant Server as Server API
  participant IDX as Indexer
  Anyone->>Server: GET /polls/:id/tally
  Server->>IDX: query public contract state
  IDX-->>Server: tally0..3, nullifier count, merkle root
  Server-->>Anyone: { tally, totalVotes, nullifierCount, merkleRoot }
  Note over Anyone: totalVotes == nullifierCount is independently checkable
```

## Why HistoricMerkleTree, not MerkleTree

`checkRoot` on a plain `MerkleTree` only accepts the *current* root. If a voter fetches
commitments and computes a path, then the organizer registers one more voter before the
voter's `castVote` lands on-chain, the root changed and a plain-tree path would be rejected —
forcing a retry and creating a race. `HistoricMerkleTree.checkRoot` accepts any root the tree
has ever held, so a path computed against an older root stays valid. See `docs/DECISIONS.md`.

## Deployment topology (dev)

```mermaid
flowchart TB
  subgraph docker-compose
    P[proof-server :6300]
    Srv[server :8080]
    Cli[client / nginx :5173]
  end
  Srv --> P
  Cli --> Srv
  Srv -.indexer/node queries.-> Net[(undeployed local network)]
```

The browser talks to the extension wallet directly (not through `docker-compose`'s
proof-server) for anything that touches voter secrets — see `docs/THREAT_MODEL.md`.
