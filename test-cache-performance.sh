#!/bin/bash

# test-cache-performance.sh
# Script para testar performance do cache de propriedades

echo "🚀 TESTE DE PERFORMANCE DO CACHE"
echo "================================"
echo ""

# Configurações
API_URL="https://alugazap.com"  # Ajuste para seu ambiente
TENANT_ID="YOUR_TENANT_ID"      # Substitua pelo seu tenantId real
SEARCH_LOCATION="praia"

# Cores para output
GREEN='\033[0.32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "📋 Configuração:"
echo "   API: $API_URL"
echo "   Tenant: ${TENANT_ID:0:10}***"
echo ""

# Função para fazer uma busca e medir tempo
do_search() {
  local iteration=$1
  local start=$(date +%s%3N)

  response=$(curl -s -X POST "$API_URL/api/ai/functions/search-properties" \
    -H "Content-Type: application/json" \
    -d "{\"tenantId\":\"$TENANT_ID\",\"location\":\"$SEARCH_LOCATION\"}")

  local end=$(date +%s%3N)
  local duration=$((end - start))

  # Verificar se retornou do cache
  from_cache=$(echo "$response" | grep -o '"fromCache":true' | wc -l)

  echo "   Request #$iteration: ${duration}ms $([ $from_cache -gt 0 ] && echo "${GREEN}[CACHE HIT]${NC}" || echo "${YELLOW}[CACHE MISS]${NC}")"

  echo "$duration"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TESTE 1: Primeira busca (esperado: MISS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
time1=$(do_search 1)
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TESTE 2: Segunda busca (esperado: HIT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
time2=$(do_search 2)
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TESTE 3: Terceira busca (esperado: HIT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
time3=$(do_search 3)
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TESTE 4: 10 buscas paralelas (stress test)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
start_parallel=$(date +%s%3N)

for i in {1..10}; do
  do_search $i &
done

wait

end_parallel=$(date +%s%3N)
duration_parallel=$((end_parallel - start_parallel))
echo "   Total: ${duration_parallel}ms"
echo "   Média: $((duration_parallel / 10))ms por request"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Busca 1 (MISS):  ${time1}ms"
echo "   Busca 2 (HIT):   ${time2}ms"
echo "   Busca 3 (HIT):   ${time3}ms"
echo ""

if [ $time1 -gt 0 ] && [ $time2 -gt 0 ]; then
  speedup=$(echo "scale=2; $time1 / $time2" | bc)
  savings=$(echo "scale=1; (($time1 - $time2) * 100) / $time1" | bc)
  echo "   ${GREEN}✅ Speedup: ${speedup}x mais rápido${NC}"
  echo "   ${GREEN}💰 Economia: ${savings}% de tempo${NC}"
else
  echo "   ⚠️  Não foi possível calcular speedup"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 ESTATÍSTICAS DO CACHE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Buscar stats do cache (ajuste a URL conforme seu endpoint)
stats=$(curl -s "$API_URL/api/admin/cache/stats")
echo "$stats" | jq '.' 2>/dev/null || echo "$stats"

echo ""
echo "✅ Teste completo!"
echo ""
echo "💡 DICAS:"
echo "   - Hit rate ideal: > 70%"
echo "   - Speedup esperado: 3-10x"
echo "   - Se hit rate < 50%, considere aumentar TTL"
