# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:24-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @repo/api build
# Production dependencies only (--legacy: the workspace does not use injected dependencies).
RUN pnpm --filter @repo/api deploy --legacy --prod /out \
    && cp -r apps/api/dist apps/api/drizzle /out/

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/package.json ./
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/drizzle ./drizzle
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/server.js"]
