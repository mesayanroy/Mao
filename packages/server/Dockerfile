# syntax=docker/dockerfile:1
# Multi-stage build: deps -> build -> runtime. See docs/DEPLOYMENT.md.

FROM node:22-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json
RUN npm ci

FROM node:22-slim AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/contracts packages/contracts
COPY packages/server packages/server
# NOTE: compiling ballot.compact requires the Compact compiler (fetched via
# `npm run bootstrap`, see docs/DECISIONS.md) — run `npm run
# compile:contracts` on the host before `docker build`, or add a compiler
# stage here once CI has verified network access to fetch it (see
# docs/TASKS.md). The server itself only needs the *shared* package's
# TypeScript, not the compiled contract artifacts.
RUN npm run build -w packages/shared
RUN npm run build -w packages/server

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 1001 midnight && \
    useradd --system --uid 1001 --gid midnight --home-dir /app midnight
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
RUN npm ci --omit=dev --workspace=@maao/shared --workspace=@maao/server
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/packages/server/dist packages/server/dist
RUN mkdir -p /app/data && chown -R midnight:midnight /app
USER midnight
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "packages/server/dist/index.js"]
