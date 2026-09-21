# Deployment

## Environment variables

| Var | Where | Notes |
|---|---|---|
| `NETWORK_ID` | server, CLI | `undeployed` \| `preview` \| `preprod` \| `mainnet` |
| `NODE_URL`, `INDEXER_URL`, `INDEXER_WS_URL`, `PROOF_SERVER_URL` | server, CLI | See `docs/DECISIONS.md` for per-network defaults |
| `PORT` | server | Fastify listen port, default `8080` |
| `CORS_ALLOWED_ORIGINS` | server | Comma-separated allowlist |
| `DATA_DIR` | server | Poll metadata JSON store path |
| `ZK_CONFIG_URL` | server | Advertised to clients via `GET /config` |
| `SPONSOR_ENABLED` | server | `true` to mount the DUST sponsorship route |
| `SPONSOR_WALLET_SEED` | server | **Secret.** Dev/local only via `.env`; production must use a secrets manager, never a plain env file on disk |
| `SPONSOR_RATE_LIMIT_PER_MINUTE` | server | Sponsor route rate limit |
| `VITE_API_BASE_URL`, `VITE_NETWORK_ID`, `VITE_ZK_CONFIG_URL` | client (build-time) | Baked into the static bundle |

## VPS deploy (Docker)

```
git clone <repo> && cd midnight-ballot
cp .env.example .env   # fill in real values, especially NETWORK_ID=preprod
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

`docker-compose.prod.yml` pins image tags, sets `restart: unless-stopped`, adds resource
limits, and removes all source bind mounts (prod images are self-contained). Put a reverse
proxy (nginx/Caddy/Traefik) in front of the `client` and `server` containers for TLS —
terminate TLS there, not in-container; this repo doesn't ship a TLS cert manager by design
(keep infra concerns out of the app images).

## Reverse proxy + TLS (outline)

Point your proxy's HTTPS vhost at `client:80` (serves the SPA and proxies `/api` internally to
`server:$PORT` per `packages/client/nginx.conf`); no separate public port for `server` is
required. Use Let's Encrypt/Caddy automatic TLS or your org's existing cert pipeline.

## Upgrade / rollback

```
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
Images are tagged by git sha and semver tag (see `.github/workflows/cd.yml`); rollback = re-run
the same two commands after pointing `image:` tags (or `.env`'s image tag var, if templated) at
the previous known-good tag, then `up -d` again. Poll metadata lives in a named volume
(`server-data`) that upgrades don't touch; on-chain state is untouched by any of this.

## Contract redeploy

Contract upgrades are new deployments (Compact contracts aren't in-place upgradeable) — run
`npm run deploy:contract` against the target network, then `npm run create:poll` to register
the new contract address with the server's metadata store. Old polls keep pointing at their
original (immutable) contract address.
