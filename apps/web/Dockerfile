# Build from the repository root: docker build -f apps/web/Dockerfile .
FROM node:24-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
# Empty, so the app calls the relative /api, which Caddy proxies to the API
ENV VITE_API_URL=
RUN pnpm --filter @repo/web build

FROM caddy:2-alpine
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv
EXPOSE 80 443
