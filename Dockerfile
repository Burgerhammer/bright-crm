FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Avoid running postinstall before prisma/schema.prisma is present (postinstall runs `prisma generate`).
RUN npm ci --ignore-scripts

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public/ exists so the production image COPY doesn't fail even if repo has no public assets.
RUN mkdir -p public

# Generate Prisma client
RUN npx prisma generate

# Build Next.js standalone (increase heap to avoid OOM in Docker builds)
RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Minimal helper for privilege drop
RUN apk add --no-cache su-exec

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy runtime deps (standalone output doesn't always include every required dependency)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema and client artifacts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create data directory for SQLite (perms fixed at runtime too)
RUN mkdir -p /app/data

# Entrypoint to fix perms then drop privileges
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

EXPOSE 3000

CMD ["node", "server.js"]
