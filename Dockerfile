# syntax=docker/dockerfile:1

############################
# 1) Dependencies
############################
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci

############################
# 2) Builder
############################
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

# ---- build args vindos do EasyPanel ----
ARG DATABASE_URL
ARG DATABASE_SSL=false
ARG DATABASE_POOL_SIZE=10
ARG GIT_SHA

# ---- ENVs disponíveis durante o build do Next ----
ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_SSL=$DATABASE_SSL
ENV DATABASE_POOL_SIZE=$DATABASE_POOL_SIZE
ENV GIT_SHA=$GIT_SHA
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build -- --webpack

############################
# 3) Runner (produção)
############################
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# (Opcional mas recomendado) também aceitar env no runtime via env vars do container
ARG DATABASE_URL
ARG DATABASE_SSL=false
ARG DATABASE_POOL_SIZE=10
ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_SSL=$DATABASE_SSL
ENV DATABASE_POOL_SIZE=$DATABASE_POOL_SIZE

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
