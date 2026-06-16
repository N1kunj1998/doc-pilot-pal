# --- Build stage ---------------------------------------------------------
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Vite inlines VITE_* vars at build time — pass the real backend URL here.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN bun run build

# --- Runtime stage ---------------------------------------------------------
# Build output is a plain Node http server (see src/server.ts), but it still
# does bare `import("@tanstack/react-start/server-entry")` at runtime, so
# node_modules has to ship too — no bun runtime needed, just plain node.
FROM node:22-slim AS runtime
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server/server.js"]
