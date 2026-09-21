# Wallet Integration

Two distinct integration paths — never mix their responsibilities. Full API facts sourced in
`docs/DECISIONS.md`.

## Browser (client) — DApp Connector

| Package | Use |
|---|---|
| `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider` | Wraps the connected wallet's `getProvingProvider()` so `contract.callTx.*` proves locally in the wallet, never on the server. |
| `@midnight-ntwrk/midnight-js-fetch-zk-config-provider` | Fetches `/zk/*` circuit artifacts over HTTP (served by nginx from `packages/client/public/zk`). |
| `@midnight-ntwrk/midnight-js-indexer-public-data-provider` | Public state reads/subscriptions directly from the indexer. |

Flow: enumerate `window.midnight`, `connect(networkId)`, verify `getConnectionStatus().networkId`
matches the app's configured network, read balances/addresses for display, then build
`ballot-client` (from `packages/shared`) with the connector's proof provider.

Every wallet under `window.midnight.*` is treated identically — the picker lists whatever keys
exist (Lace = `mnLace`), never a hardcoded single wallet.

## Server / CLI scripts — headless Wallet SDK

| Package | Use |
|---|---|
| `@midnightntwrk/wallet-sdk-hd` | Derive shielded/unshielded/DUST keys from a seed (`m/44'/2400'/account'/role/index`). |
| `@midnightntwrk/wallet-sdk-facade` | `WalletFacade.init({ configuration, shielded, unshielded, dust })` — composes the three sub-wallets. |
| `@midnightntwrk/wallet-sdk-shielded` / `-unshielded-wallet` / `-dust-wallet` | Per-token-type wallet implementations passed into the facade. |
| `@midnightntwrk/wallet-sdk-address-format` | Bech32m encode/decode. |
| `@midnight-ntwrk/ledger-v8` | `ZswapSecretKeys`, `DustSecretKey`, `LedgerParameters`. |

Used only by `packages/server/src/wallet/*` (sponsor wallet — DUST fees only) and
`scripts/deploy-contract.ts` / `create-poll.ts` (organizer-run, one-off, never touches voter
data). `wallet.stop()` is called on `SIGINT`/`SIGTERM` for graceful shutdown (server) and at
the end of each CLI script.

## DUST sponsorship

```
finalized user tx (already proven, user-signed)
        │
        ▼
wallet.balanceFinalizedTransaction(tx, keys, { ttl, tokenKindsToBalance: ['dust'] })
        │  adds ONLY dust fee inputs, cannot touch proven circuit inputs
        ▼
wallet.submitTransaction(tx)
```

The sponsor wallet's `shieldedSecretKeys`/`dustSecretKey` never leave the server process; the
voter's proof and witnesses never enter it either — `balanceFinalizedTransaction` operates on
transaction bytes the voter's wallet already finalized. See `docs/THREAT_MODEL.md`.

## Environment setup (Node only)

Both server and CLI scripts must set `globalThis.WebSocket = WebSocket` (from the `ws` package)
and call `setNetworkId(...)` before constructing any provider — `getNetworkId()` throws until
it's called explicitly (confirmed in `docs/DECISIONS.md`).
