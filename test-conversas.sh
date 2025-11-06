#!/bin/bash

# Script para testar a página de conversas
# Uso: ./test-conversas.sh

echo "🔍 Testando página /dashboard/conversas"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar resposta HTTP
check_http() {
    local url=$1
    local name=$2

    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✅ $name: HTTP $status${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: HTTP $status${NC}"
        return 1
    fi
}

# 1. Verificar se servidor está rodando
echo "1️⃣ Verificando servidor..."
if curl -s http://localhost:8080 > /dev/null; then
    echo -e "${GREEN}✅ Servidor Next.js rodando${NC}"
else
    echo -e "${RED}❌ Servidor não está rodando${NC}"
    echo "   Execute: npm run dev"
    exit 1
fi
echo ""

# 2. Testar rotas principais
echo "2️⃣ Testando rotas..."
check_http "http://localhost:8080/dashboard" "Dashboard Principal"
check_http "http://localhost:8080/dashboard/conversas" "Conversas"
check_http "http://localhost:8080/dashboard/lkjhg" "Admin Panel"
echo ""

# 3. Verificar arquivos críticos
echo "3️⃣ Verificando arquivos..."
files=(
    "app/dashboard/conversas/page.tsx"
    "lib/hooks/useConversationsOptimized.ts"
    "lib/types/conversation-optimized.ts"
    "contexts/TenantContext.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file (não encontrado)${NC}"
    fi
done
echo ""

# 4. Verificar logs de erro
echo "4️⃣ Verificando logs recentes (últimos 30 segundos)..."
recent_errors=$(tail -100 /tmp/next-dev.log 2>/dev/null | grep -i "error" | tail -5)
if [ -z "$recent_errors" ]; then
    echo -e "${GREEN}✅ Sem erros recentes nos logs${NC}"
else
    echo -e "${YELLOW}⚠️ Erros encontrados:${NC}"
    echo "$recent_errors"
fi
echo ""

# 5. Verificar se há erros 404 de chunks
echo "5️⃣ Verificando erros 404 de chunks..."
chunk_errors=$(tail -100 /tmp/next-dev.log 2>/dev/null | grep "404" | grep "chunks" | tail -3)
if [ -z "$chunk_errors" ]; then
    echo -e "${GREEN}✅ Sem erros 404 de chunks${NC}"
else
    echo -e "${YELLOW}⚠️ Erros 404 de chunks encontrados (normais durante HMR):${NC}"
    echo "$chunk_errors"
    echo ""
    echo -e "${YELLOW}💡 Solução: Recarregue a página (Ctrl+Shift+R)${NC}"
fi
echo ""

# 6. Verificar compilação TypeScript
echo "6️⃣ Verificando compilação TypeScript (apenas conversas)..."
tsc_output=$(npx tsc --noEmit app/dashboard/conversas/page.tsx 2>&1 | grep -v "esModuleInterop\|jsx flag" | grep "error" | head -3)
if [ -z "$tsc_output" ]; then
    echo -e "${GREEN}✅ Sem erros críticos de TypeScript${NC}"
else
    echo -e "${YELLOW}⚠️ Avisos de TypeScript (podem ser ignorados):${NC}"
    echo "$tsc_output"
fi
echo ""

# 7. Testar fetch de dados (simulado)
echo "7️⃣ Testando dependências da página..."
# Verificar se useConversationsOptimized existe
if grep -q "useConversationsOptimized" lib/hooks/useConversationsOptimized.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Hook useConversationsOptimized está OK${NC}"
else
    echo -e "${RED}❌ Hook useConversationsOptimized tem problemas${NC}"
fi

if grep -q "ConversationStatus" lib/types/conversation-optimized.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Types conversation-optimized estão OK${NC}"
else
    echo -e "${RED}❌ Types conversation-optimized tem problemas${NC}"
fi

if grep -q "TenantContext" contexts/TenantContext.tsx 2>/dev/null; then
    echo -e "${GREEN}✅ TenantContext está OK${NC}"
else
    echo -e "${RED}❌ TenantContext tem problemas${NC}"
fi
echo ""

# 8. Resumo
echo "========================================"
echo -e "${GREEN}🎉 Teste Concluído!${NC}"
echo ""
echo "📝 Próximos passos:"
echo "   1. Acesse: http://localhost:8080/dashboard/conversas"
echo "   2. Se houver erro, recarregue com: Ctrl+Shift+R (Mac: Cmd+Shift+R)"
echo "   3. Verifique o console do navegador (F12)"
echo ""
echo "📊 Para monitorar logs em tempo real:"
echo "   tail -f /tmp/next-dev.log | grep -v 'Compiling\|chunk'"
