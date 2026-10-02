# Maao

Private, eligibility-gated voting with publicly verifiable tallies — built on [Midnight Network](https://midnight.network). Only allowlisted members can vote, nobody can tell who voted or how, anyone can verify the tally, and on-chain nullifiers block double voting.

Read `docs/CONTEXT.md` for the full single-file project digest, or `docs/PRD.md` / `docs/ARCHITECTURE.md` / `docs/CONTRACT_SPEC.md` for the specifics.

---

## 🧪 Testers

**Tester sheet:** https://docs.google.com/spreadsheets/d/1ygm5Zu_e05EzTtL7cVz3G_rr9JaG2aon-g9OzCLBCoE/edit?resourcekey=&gid=1539670642#gid=1539670642

Run the steps in this order and log each one (pass/fail + notes) as a row in the sheet:

| # | Role | Step | Expected result |
|---|---|---|---|
| 1 | Anyone | Open the app and connect a Midnight wallet (e.g. Lace) | Header shows **Connected** |
| 2 | Organizer | *Organizer* page → create a poll (title + 2–4 options) → **Deploy** | Contract address shown; phase = Registration |
| 3 | Voter | *Vote* page → generate a credential, copy the commitment hash | Secret stays in the browser; only the hash is shown |
| 4 | Organizer | Register the voter's commitment | Commitment added to the allowlist |
| 5 | Organizer | **Open voting** | Phase = Voting; no more registrations accepted |
| 6 | Voter | Pick an option and cast the vote | Transaction succeeds; tally increments |
| 7 | Voter | Try to vote again with the same credential | Rejected on-chain: `already voted` |
| 8 | Unregistered | Try to vote with a credential that was never registered | Rejected: `not a registered voter` |
| 9 | Organizer | **Close voting** | Phase = Closed; further votes rejected |
| 10 | Anyone | *Results* page (no wallet) | Live tally shown; `totalVotes == nullifierCount` |

Follow Maao on X: [@Maao](https://x.com/SayanRo27946715)

---

## 🚀 Running the Web Application

### Option A: Local Frontend & API Development (Fastest)

1. **Start the Frontend Client UI:**
   ```bash
   npm run dev:client
   ```
   Open **[http://localhost:5173](http://localhost:5173)** in your browser.

2. **Start the Fastify API Backend (Optional / in another terminal):**
   ```bash
   npm run dev:server
   ```
   Listens on **`http://localhost:3000`**.

### Option B: Full Docker Stack (Undeployed Local Chain)

```bash
npm run bootstrap        # Verifies Node 22+/Docker, installs dependencies, seeds .env
npm run docker:up        # Boots proof-server, Fastify backend, and React frontend
```

In another terminal, as the organizer:
```bash
npm run deploy:contract  # Deploys ballot.compact to the local network
npm run create:poll      # Registers poll title/options/address with the server
npm run register:voter   # Adds a voter commitment to the on-chain allowlist
```

---

## 🎬 2-Minute Demo Flow

1. **Organizer** (*Organizer page*): Connect wallet (e.g., Lace) → Create a poll ("Approve Q3 Budget", options: Yes / No / Abstain) → Deploy → Copy contract address.
2. **Voter A** (*Vote page*): Generate a credential secret (stored strictly in your browser) → Share printed commitment hash with the organizer → Wait for allowlist registration → Once voting opens, pick an option & cast vote.
3. **Organizer**: Open voting, and later close voting once turnout is complete.
4. **Anyone** (*Results page*, no wallet required): Watch tally update live; independently verify `totalVotes == nullifierCount` directly from public chain data.
5. **Double-Voting Rejection**: Try voting twice with Voter A's credential — the second attempt is rejected on-chain by the smart contract nullifier set.

---

## 🛡️ Privacy Invariants & Security

- **Zero Secret Exposure**: Only a hiding hash of each voter's secret (their "commitment") touches the chain.
- **Client-Side Proving**: Proofs are generated inside the connected browser wallet / local proof server. The backend server **never** sees voter secrets, witnesses, or Merkle paths.
- **Unlinkable Nullifiers**: Nullifiers are domain-separated per poll ID, preventing cross-poll voter tracking.
- **Path-Leaf Binding Assertions**: Smart contract explicitly asserts `path.leaf == commitment` before checking Merkle roots.

---

## 🛠️ Developer Commands & Scripts

| Command | Description |
|---|---|
| `npm run dev:client` | Start Vite React dev server at `http://localhost:5173` |
| `npm run dev:server` | Start Fastify backend server at `http://localhost:3000` |
| `npm run typecheck` | Run TypeScript strict checking across all 4 packages |
| `npm run build` | Full build (contracts -> shared -> server -> client) |
| `npm run compile:contracts` | Recompile `ballot.compact` ZK artifacts |
| `npm test` | Run test suite (Fastify routes & contract simulator) |

---

## 📁 Repository Layout

```
packages/contracts   Compact smart contract & witness definitions
packages/server      Fastify API: metadata repository, reads, DUST sponsorship
packages/client      Vite + React UI (black/white minimal theme, wallet integration)
packages/shared      Shared config, Zod schemas, providers, ballot contract client wrapper
scripts/             Bootstrap & CLI tools (deploy-contract, create-poll, register-voter, read-tally)
docs/                PRD, architecture, contract spec, API, threat model, deployment
```
