# =========================
# 1) Dependencies
# =========================
FROM node:22-alpine AS deps
WORKDIR /app

# libs úteis (principalmente para sharp/next/image em alguns cenários)
RUN apk add --no-cache libc6-compat

# Copia manifests primeiro (melhor cache)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Instala dependências conforme lockfile
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  else npm i; fi

# =========================
# 2) Builder
# =========================
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copia node_modules do deps
COPY --from=deps /app/node_modules ./node_modules

# Copia o restante do projeto
COPY . .

# (Recomendado) Desabilita telemetria
ENV NEXT_TELEMETRY_DISABLED=1

# Build
RUN \
  if [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  else npm run build; fi

# =========================
# 3) Runner (produção)
# =========================
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário não-root
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copia somente o necessário do standalone
# (o Next cria `.next/standalone` e `.next/static`)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Se você usa uploads no /public/uploads em runtime (avatar, etc),
# é MUITO RECOMENDADO usar volume e garantir que a pasta exista:
RUN mkdir -p ./public/uploads/avatars && chown -R nextjs:nodejs ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# server.js vem dentro do standalone
CMD ["node", "server.js"]
