# syntax=docker/dockerfile:1

############################
# 1) Dependencies
############################
FROM node:22-alpine AS deps
WORKDIR /app

# libs comuns que às vezes são necessárias (sharp, etc.)
RUN apk add --no-cache libc6-compat

# Copia manifests
COPY package.json package-lock.json* ./

# Instala deps (inclui devDeps para build)
RUN npm ci

############################
# 2) Builder
############################
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Reusa node_modules do stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copia o restante do projeto
COPY . .

# Build do Next
RUN npm run build

############################
# 3) Runner (produção)
############################
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Usuário não-root
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Se você estiver usando output: "standalone"
# Isso copia o servidor standalone do Next + assets necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Permissões
RUN chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 3000

# Em standalone, o entrypoint é server.js na raiz copiada
CMD ["node", "server.js"]
