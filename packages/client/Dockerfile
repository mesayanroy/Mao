# syntax=docker/dockerfile:1
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
COPY packages/client packages/client
# See the same note in packages/server/Dockerfile: ballot.compact must be
# compiled on the host (npm run compile:contracts) before this build so its
# ZK artifacts exist to copy into public/zk below.
RUN npm run build -w packages/shared
RUN npm run build -w packages/client

FROM nginx:1.27-alpine AS runtime
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/packages/client/dist /usr/share/nginx/html
COPY --from=build /repo/packages/client/public/zk /usr/share/nginx/html/zk
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1
EXPOSE 80
