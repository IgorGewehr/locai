# PowerShell script para aplicar CORS no Firebase Storage

Write-Host "🔧 Aplicando configuração CORS ao Firebase Storage..." -ForegroundColor Yellow
Write-Host ""

# Primeiro, instalar gcloud SDK se não estiver instalado
$gcloudInstalled = Get-Command gcloud -ErrorAction SilentlyContinue

if (-not $gcloudInstalled) {
    Write-Host "❌ gcloud não está instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale o Google Cloud SDK:" -ForegroundColor Yellow
    Write-Host "1. Baixe de: https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
    Write-Host "2. Execute o instalador" -ForegroundColor Cyan
    Write-Host "3. Abra um novo PowerShell e execute este script novamente" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ gcloud encontrado!" -ForegroundColor Green
Write-Host ""

# Fazer login
Write-Host "📝 Fazendo login no Google Cloud..." -ForegroundColor Yellow
gcloud auth login

# Configurar projeto
Write-Host "🎯 Configurando projeto..." -ForegroundColor Yellow
gcloud config set project locai-76dcf

# Aplicar CORS
Write-Host "🚀 Aplicando configuração CORS..." -ForegroundColor Yellow
gsutil cors set cors.json gs://locai-76dcf.appspot.com

# Verificar
Write-Host ""
Write-Host "🔍 Verificando configuração..." -ForegroundColor Yellow
gsutil cors get gs://locai-76dcf.appspot.com

Write-Host ""
Write-Host "✅ CORS configurado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Limpe o cache do navegador (Ctrl+Shift+Delete)" -ForegroundColor Cyan
Write-Host "2. Reinicie o servidor (npm run dev)" -ForegroundColor Cyan
Write-Host "3. Teste o upload em http://localhost:3000/test-storage" -ForegroundColor Cyan