# syntax=docker/dockerfile:1

# ---------- deps: install node_modules (skip postinstall: schema not copied yet) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---------- build: generate prisma client + compile Next standalone ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# generate never connects, but prisma.config.ts wants a defined URL
ENV DATABASE_URL="file:./build-placeholder.db"
RUN npx prisma generate && npm run build

# ---------- migrator: one-off service that applies migrations + seeds ----------
FROM node:22-alpine AS migrator
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/src/types ./src/types
# Run as the SAME uid as the app container so the SQLite file in the shared
# volume stays writable by the app (root-owned db => read-only app => broken writes).
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs \
    && mkdir -p /app/data && chown nextjs:nodejs /app/data
USER nextjs
ENV npm_config_cache=/tmp/.npm
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts"]

# ---------- runner: minimal production image ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
