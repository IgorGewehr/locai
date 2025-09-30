#!/bin/bash

# LocAI Docker Setup Script
# Este script automatiza a configuração inicial do Docker

set -e

echo "🐳 LocAI Docker Setup Script"
echo "============================="

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

echo "✅ Docker e Docker Compose estão instalados"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto LocAI"
    exit 1
fi

echo "✅ Diretório correto detectado"

# Criar arquivo .env.local se não existir
if [ ! -f ".env.local" ]; then
    echo "📝 Criando arquivo .env.local..."
    cp .env.docker .env.local
    echo "✅ Arquivo .env.local criado com base no template"
    echo "⚠️  IMPORTANTE: Edite o arquivo .env.local com suas configurações"
else
    echo "✅ Arquivo .env.local já existe"
fi

# Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p logs uploads .sessions docker/n8n/workflows
chmod 755 logs uploads .sessions

# Criar arquivo de configuração Redis personalizado se não existir
if [ ! -f "docker/redis/redis.conf" ]; then
    echo "⚙️ Configuração Redis já existe"
else
    echo "✅ Configuração Redis criada"
fi

# Gerar senhas seguras se necessário
echo "🔐 Verificando configurações de segurança..."

# Função para gerar senha segura
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Verificar se JWT_SECRET está configurado
if grep -q "your-super-secure-jwt-secret-key-change-this-in-production" .env.local; then
    JWT_SECRET=$(generate_password)
    sed -i.bak "s/your-super-secure-jwt-secret-key-change-this-in-production/$JWT_SECRET/g" .env.local
    echo "✅ JWT_SECRET gerado automaticamente"
fi

# Verificar se N8N_ENCRYPTION_KEY está configurado
if grep -q "your-n8n-encryption-key-32-chars" .env.local; then
    N8N_KEY=$(generate_password)
    sed -i.bak "s/your-n8n-encryption-key-32-chars/$N8N_KEY/g" .env.local
    echo "✅ N8N_ENCRYPTION_KEY gerado automaticamente"
fi

echo ""
echo "🚀 Setup concluído! Próximos passos:"
echo ""
echo "1. Edite o arquivo .env.local com suas configurações:"
echo "   - Credenciais do Firebase"
echo "   - OpenAI API Key"
echo "   - Outras configurações específicas"
echo ""
echo "2. Para desenvolvimento:"
echo "   npm run docker:dev"
echo ""
echo "3. Para produção:"
echo "   npm run docker:prod"
echo ""
echo "4. Para verificar se tudo está funcionando:"
echo "   curl http://localhost:8080/api/health"
echo ""
echo "📖 Consulte DOCKER.md para documentação completa"
echo ""

# Perguntar se deve iniciar em modo desenvolvimento
read -p "🤔 Deseja iniciar o ambiente de desenvolvimento agora? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Iniciando ambiente de desenvolvimento..."
    npm run docker:dev
else
    echo "👍 Setup concluído. Execute 'npm run docker:dev' quando estiver pronto!"
fi