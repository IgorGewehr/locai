#!/bin/bash

# Script para testar o tracking de métricas
# Uso: ./test-metrics-tracking.sh [TENANT_ID]

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TENANT_ID="${1:-}"

if [ -z "$TENANT_ID" ]; then
    echo -e "${RED}❌ Erro: TENANT_ID não fornecido${NC}"
    echo "Uso: ./test-metrics-tracking.sh YOUR_TENANT_ID"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧪 Testando Sistema de Métricas${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📋 Tenant ID: ${YELLOW}${TENANT_ID}${NC}"
echo ""

# Gerar IDs únicos para o teste
SESSION_ID="test-session-$(date +%s)"
LEAD_ID="test-lead-$(date +%s)"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1️⃣ Testando track-message-engagement${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "http://localhost:8080/api/ai/functions/track-message-engagement" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"sessionId\": \"$SESSION_ID\",
    \"leadId\": \"$LEAD_ID\",
    \"messageId\": \"msg-001\",
    \"clientResponded\": true,
    \"responseTime\": 30
  }")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅ Message engagement tracked${NC}"
    echo "$body" | head -3
else
    echo -e "${RED}❌ Failed (HTTP $status)${NC}"
    echo "$body"
fi

echo ""
sleep 1

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2️⃣ Testando track-conversion-step${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "http://localhost:8080/api/ai/functions/track-conversion-step" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"leadId\": \"$LEAD_ID\",
    \"from\": \"new\",
    \"to\": \"qualified\",
    \"metadata\": {
      \"source\": \"test\"
    }
  }")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅ Conversion step tracked${NC}"
    echo "$body" | head -3
else
    echo -e "${RED}❌ Failed (HTTP $status)${NC}"
    echo "$body"
fi

echo ""
sleep 1

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3️⃣ Testando track-qualification-milestone${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "http://localhost:8080/api/ai/functions/track-qualification-milestone" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"leadId\": \"$LEAD_ID\",
    \"milestone\": \"qualified\",
    \"timeToMilestone\": 180,
    \"metadata\": {
      \"source\": \"test\"
    }
  }")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅ Qualification milestone tracked${NC}"
    echo "$body" | head -3
else
    echo -e "${RED}❌ Failed (HTTP $status)${NC}"
    echo "$body"
fi

echo ""
sleep 1

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4️⃣ Testando track-conversation-session${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "http://localhost:8080/api/ai/functions/track-conversation-session" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"sessionId\": \"$SESSION_ID\",
    \"duration\": 300,
    \"messageCount\": 10,
    \"outcome\": \"qualified\",
    \"metadata\": {
      \"source\": \"test\"
    }
  }")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅ Conversation session tracked${NC}"
    echo "$body" | head -3
else
    echo -e "${RED}❌ Failed (HTTP $status)${NC}"
    echo "$body"
fi

echo ""
sleep 2

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}5️⃣ Verificando Analytics API${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

response=$(curl -s \
  -X GET "http://localhost:8080/api/metrics/analytics?period=7d" \
  -H "x-tenant-id: $TENANT_ID")

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Analytics API funcionando${NC}"
    echo ""
    echo "📊 Resumo dos dados:"
    echo "$response" | grep -o '"metricsProcessed":[0-9]*' || echo "  Métricas processadas: (não encontrado)"
    echo "$response" | grep -o '"totalConversations":[0-9]*' || echo "  Total conversas: 0"
    echo "$response" | grep -o '"responseRate":[0-9.]*' || echo "  Taxa de resposta: 0%"
else
    echo -e "${RED}❌ Analytics API com erro${NC}"
    echo "$response" | head -5
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Testes Concluídos!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📊 Próximos passos:"
echo -e "  1. Acesse: ${BLUE}http://localhost:8080/dashboard/metricas${NC}"
echo -e "  2. Clique no botão Refresh"
echo -e "  3. Verifique se os dados aparecem"
echo ""
echo -e "🔍 Para verificar no Firebase:"
echo -e "  Firestore → ${YELLOW}tenants/$TENANT_ID/metrics${NC}"
echo ""
