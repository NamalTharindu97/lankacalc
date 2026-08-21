# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN npm install --global npm@11.6.2

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS migrate
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/server/db ./src/server/db
COPY src/server/env.ts ./src/server/env.ts
CMD ["npm", "run", "db:migrate"]

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ARG BETTER_AUTH_SECRET
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ARG BETTER_AUTH_URL
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ARG SITE_URL
ENV SITE_URL=${SITE_URL}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
