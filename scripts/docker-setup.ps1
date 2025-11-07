# LocAI Docker Setup Script para Windows
# Este script automatiza a configuração inicial do Docker no Windows

Write-Host "🐳 LocAI Docker Setup Script (Windows)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Verificar se Docker está instalado
try {
    docker --version | Out-Null
    Write-Host "✅ Docker está instalado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não está instalado. Por favor, instale o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose está instalado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script no diretório raiz do projeto LocAI" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Diretório correto detectado" -ForegroundColor Green

# Criar arquivo .env.local se não existir
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Criando arquivo .env.local..." -ForegroundColor Yellow
    Copy-Item ".env.docker" ".env.local"
    Write-Host "✅ Arquivo .env.local criado com base no template" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANTE: Edite o arquivo .env.local com suas configurações" -ForegroundColor Yellow
} else {
    Write-Host "✅ Arquivo .env.local já existe" -ForegroundColor Green
}

# Criar diretórios necessários
Write-Host "📁 Criando diretórios necessários..." -ForegroundColor Yellow
$directories = @("logs", "uploads", ".sessions", "docker\n8n\workflows")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "✅ Diretórios criados" -ForegroundColor Green

# Gerar senhas seguras
Write-Host "🔐 Verificando configurações de segurança..." -ForegroundColor Yellow

function Generate-Password {
    $bytes = New-Object byte[] 32
    ([System.Security.Cryptography.RNGCryptoServiceProvider]::Create()).GetBytes($bytes)
    return [Convert]::ToBase64String($bytes) -replace '[=+/]', '' | Select-Object -First 25
}

# Verificar e atualizar JWT_SECRET
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "your-super-secure-jwt-secret-key-change-this-in-production") {
    $jwtSecret = Generate-Password
    $envContent = $envContent -replace "your-super-secure-jwt-secret-key-change-this-in-production", $jwtSecret
    Set-Content ".env.local" $envContent
    Write-Host "✅ JWT_SECRET gerado automaticamente" -ForegroundColor Green
}

# Verificar e atualizar N8N_ENCRYPTION_KEY
if ($envContent -match "your-n8n-encryption-key-32-chars") {
    $n8nKey = Generate-Password
    $envContent = $envContent -replace "your-n8n-encryption-key-32-chars", $n8nKey
    Set-Content ".env.local" $envContent
    Write-Host "✅ N8N_ENCRYPTION_KEY gerado automaticamente" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Setup concluído! Próximos passos:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Edite o arquivo .env.local com suas configurações:" -ForegroundColor White
Write-Host "   - Credenciais do Firebase" -ForegroundColor White
Write-Host "   - OpenAI API Key" -ForegroundColor White
Write-Host "   - Outras configurações específicas" -ForegroundColor White
Write-Host ""
Write-Host "2. Para desenvolvimento:" -ForegroundColor White
Write-Host "   npm run docker:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Para produção:" -ForegroundColor White
Write-Host "   npm run docker:prod" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Para verificar se tudo está funcionando:" -ForegroundColor White
Write-Host "   curl http://localhost:8080/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Consulte DOCKER.md para documentação completa" -ForegroundColor Yellow
Write-Host ""

# Perguntar se deve iniciar em modo desenvolvimento
$response = Read-Host "🤔 Deseja iniciar o ambiente de desenvolvimento agora? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "🚀 Iniciando ambiente de desenvolvimento..." -ForegroundColor Green
    npm run docker:dev
} else {
    Write-Host "👍 Setup concluído. Execute 'npm run docker:dev' quando estiver pronto!" -ForegroundColor Green
}