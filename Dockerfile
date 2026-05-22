# ============================================================
# LOCAI - Multi-Stage Dockerfile
# ============================================================
# Otimizado para Next.js 15 com:
# - Multi-stage build para imagens menores
# - Cache de dependências otimizado
# - Suporte a sharp para processamento de imagens
# - Standalone output para produção
# ============================================================

# ============================================================
# STAGE 1: Base - Dependências do sistema
# ============================================================
FROM node:20-alpine AS base

# Instalar dependências do sistema necessárias
# - libc6-compat: Compatibilidade com glibc (necessário para algumas deps)
# - openssl: Necessário para criptografia/Firebase
# - python3, make, g++: Para compilar dependências nativas (sharp, bcrypt)
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++

WORKDIR /app

# ============================================================
# STAGE 2: Dependencies - Instalar dependências
# ============================================================
FROM base AS deps

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências com cache otimizado
# --legacy-peer-deps para compatibilidade com algumas deps
RUN npm ci --legacy-peer-deps

# ============================================================
# STAGE 3: Builder - Build da aplicação
# ============================================================
FROM base AS builder

WORKDIR /app

# Copiar dependências instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Desabilitar telemetria do Next.js durante build
ENV NEXT_TELEMETRY_DISABLED=1

# Variáveis necessárias para build (valores placeholder)
# Em produção, serão sobrescritas pelo docker-compose ou runtime
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# Build da aplicação
# O Next.js vai gerar output standalone automaticamente
RUN npm run build

# ============================================================
# STAGE 4: Runner - Imagem final de produção
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Instalar apenas dependências de runtime necessárias
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl

# Configurar ambiente de produção
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7070
ENV HOSTNAME="0.0.0.0"

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Copiar build standalone (se disponível) ou .next completo
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar package.json para referência de versão
COPY --from=builder /app/package.json ./package.json

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 7070

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:7070/api/health || exit 1

# Comando de inicialização
# Usa o server.js gerado pelo standalone output
CMD ["node", "server.js"]

# ============================================================
# STAGE ALTERNATIVO: Development
# ============================================================
FROM base AS development

WORKDIR /app

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Configurar ambiente de desenvolvimento
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7070
ENV HOSTNAME="0.0.0.0"

# Expor porta
EXPOSE 7070

# Health check para dev
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7070/api/health || exit 1

# Comando de desenvolvimento com hot reload
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
