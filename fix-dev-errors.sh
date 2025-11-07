#!/bin/bash

# Script para corrigir erros 404 no Next.js Dev Server
# Uso: ./fix-dev-errors.sh

echo "🔧 Iniciando correção de erros do Next.js..."
echo ""

# 1. Parar servidor Next.js
echo "1️⃣ Parando servidor Next.js..."
pkill -f "next dev" 2>/dev/null
sleep 2
echo "   ✅ Servidor parado"
echo ""

# 2. Limpar cache e build
echo "2️⃣ Limpando cache e build..."
rm -rf .next
rm -rf out
rm -rf node_modules/.cache
rm -rf .turbo
echo "   ✅ Cache limpo"
echo ""

# 3. Verificar se há erros de TypeScript críticos
echo "3️⃣ Verificando erros críticos..."
npx tsc --noEmit --pretty 2>&1 | grep -E "app/dashboard/conversas|app/dashboard/lkjhg|app/api/admin/users-enhanced" > /tmp/tsc-errors.txt
if [ -s /tmp/tsc-errors.txt ]; then
    echo "   ⚠️ Erros encontrados:"
    cat /tmp/tsc-errors.txt
    echo ""
else
    echo "   ✅ Sem erros críticos nas páginas modificadas"
    echo ""
fi

# 4. Verificar dependências
echo "4️⃣ Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "   📦 Instalando dependências..."
    npm install
else
    echo "   ✅ Dependências OK"
fi
echo ""

# 5. Iniciar servidor novamente
echo "5️⃣ Iniciando servidor Next.js..."
echo "   🚀 Servidor rodando em: http://localhost:8080"
echo "   📊 Admin Panel: http://localhost:8080/dashboard/lkjhg"
echo "   💬 Conversas: http://localhost:8080/dashboard/conversas"
echo ""
echo "   Logs em: /tmp/next-dev.log"
echo ""

npm run dev > /tmp/next-dev.log 2>&1 &
sleep 3

# 6. Verificar se está rodando
if curl -s http://localhost:8080 >/dev/null; then
    echo "   ✅ Servidor rodando com sucesso!"
else
    echo "   ⚠️ Servidor ainda inicializando... aguarde 10 segundos"
fi

echo ""
echo "✨ Processo concluído!"
echo ""
echo "📝 Para ver os logs em tempo real:"
echo "   tail -f /tmp/next-dev.log"
echo ""
echo "🔍 Para verificar erros específicos:"
echo "   tail -f /tmp/next-dev.log | grep -E '(404|error|Error)'"
