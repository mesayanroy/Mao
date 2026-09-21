# API — `packages/server`

Base URL: `/api/v1`. JSON in/out, zod-validated. All responses are either `{ "data": ... }` or
`{ "error": { "code": "...", "message": "..." } }`.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Liveness + chain/indexer reachability. Docker healthcheck target. |
| GET | `/api/v1/config` | none | Network id, indexer URLs, contract address(es), ZK artifact URL. |
| GET | `/api/v1/polls` | none | List poll metadata: title, option labels, contract address, live phase. |
| POST | `/api/v1/polls` | none (MVP) | Store off-chain metadata after an organizer deploys a poll on-chain. |
| GET | `/api/v1/polls/:id` | none | One poll's metadata + live phase read from the indexer. |
| GET | `/api/v1/polls/:id/tally` | none | Public tally, total votes, nullifier count, current Merkle root. |
| GET | `/api/v1/polls/:id/commitments` | none | Full public commitment list so clients rebuild Merkle paths locally. |
| POST | `/api/v1/polls/:id/sponsor` | none, rate-limited | Optional DUST fee sponsorship for a finalized tx (`SPONSOR_ENABLED=true` only). |

## `GET /health`

```json
{ "data": { "status": "ok", "chain": "reachable", "indexer": "reachable" } }
```
Returns HTTP 503 with `"status": "degraded"` if the indexer/node isn't reachable.

## `GET /api/v1/config`

```json
{
  "data": {
    "networkId": "preprod",
    "indexerUrl": "https://indexer.preprod.midnight.network/api/v4/graphql",
    "indexerWsUrl": "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
    "zkConfigUrl": "https://ballot.example.org/zk"
  }
}
```

## `GET /api/v1/polls`

```json
{
  "data": [
    {
      "id": "poll_9f2c",
      "title": "Approve Q3 budget",
      "options": ["Yes", "No", "Abstain"],
      "contractAddress": "0200a1b2...",
      "phase": "Voting"
    }
  ]
}
```

## `POST /api/v1/polls`

Request (organizer, after their wallet already deployed the contract on-chain):

```json
{
  "title": "Approve Q3 budget",
  "options": ["Yes", "No", "Abstain"],
  "contractAddress": "0200a1b2..."
}
```

Response: `201 { "data": { "id": "poll_9f2c" } }`. `options` length must be 2–4 (zod-enforced,
matches the contract's `optionCount` bound). This endpoint never receives voter data — it only
records the *public* facts an organizer already put on-chain.

## `GET /api/v1/polls/:id`

```json
{
  "data": {
    "id": "poll_9f2c",
    "title": "Approve Q3 budget",
    "options": ["Yes", "No", "Abstain"],
    "contractAddress": "0200a1b2...",
    "phase": "Voting"
  }
}
```

## `GET /api/v1/polls/:id/tally`

```json
{
  "data": {
    "tally": [128, 94, 12],
    "totalVotes": 234,
    "nullifierCount": 234,
    "merkleRoot": "7f3a...",
    "phase": "Voting"
  }
}
```
`totalVotes === nullifierCount` is the public, independently-checkable invariant described in
`docs/CONTRACT_SPEC.md`.

## `GET /api/v1/polls/:id/commitments`

```json
{ "data": { "depth": 10, "commitments": ["a1b2...", "c3d4...", "..."] } }
```
Ordered by insertion index — the index a commitment appears at is its Merkle leaf index,
needed by the client to build the matching path locally.

## `POST /api/v1/polls/:id/sponsor`

Only mounted with a real handler when `SPONSOR_ENABLED=true`; otherwise responds
`501 { "error": { "code": "SPONSOR_DISABLED", "message": "..." } }`.

Request: `{ "finalizedTx": "<hex>" }` — an already-proven, user-signed transaction. Response:
`{ "data": { "txId": "..." } }` once the server has added DUST fee inputs and submitted it.
Rate-limited per `SPONSOR_RATE_LIMIT_PER_MINUTE`. See `docs/THREAT_MODEL.md` for why this can't
leak voter secrets.

## Error codes

| `code` | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params failed zod validation. |
| `NOT_FOUND` | 404 | Poll id doesn't exist in the off-chain store. |
| `SPONSOR_DISABLED` | 501 | Sponsor route hit while `SPONSOR_ENABLED=false`. |
| `RATE_LIMITED` | 429 | Sponsor route exceeded its per-minute budget. |
| `INDEXER_UNREACHABLE` | 502 | Upstream indexer query failed. |
| `INTERNAL` | 500 | Unhandled server error (never includes stack traces in the response body). |
