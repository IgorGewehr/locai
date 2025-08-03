#\!/bin/bash
API_BASE="http://localhost:3000/api"
PHONE="+5511999888777"
TENANT="demo_tenant"

echo "========================================="
echo "   BATERIA DE TESTES - SOFIA V2         "
echo "========================================="
echo ""

# Função para enviar mensagem
send_msg() {
    local msg="$1"
    echo "📝 Testando: $msg"
    response=$(curl -s -X POST "$API_BASE/agent" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$msg\",\"clientPhone\":\"$PHONE\",\"tenantId\":\"$TENANT\"}" \
        --max-time 15)
    
    # Extrair resposta
    sofia=$(echo "$response" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    echo "🤖 Sofia: ${sofia:0:100}..."
    echo ""
    sleep 2
}

echo "=== 1. TESTE: BUSCA DE PROPRIEDADES ==="
send_msg "oi, quero alugar um apartamento em florianópolis"
send_msg "procuro casa para 6 pessoas em bombinhas"

echo "=== 2. TESTE: CÁLCULO DE PREÇOS ==="
send_msg "quanto fica do dia 15 ao dia 20 de março de 2025?"
send_msg "qual o preço para 3 diárias?"

echo "=== 3. TESTE: VALIDAÇÃO DE DATAS ==="
send_msg "quero de 1 a 5 de janeiro de 2024"
send_msg "quero do dia 20 ao dia 15 de abril"

echo "=== 4. TESTE: MÍDIA ==="
send_msg "me manda as fotos"

echo "=== 5. TESTE: DETALHES ==="
send_msg "me conte mais sobre a primeira opção"

echo "=== 6. TESTE: REGISTRO CLIENTE ==="
send_msg "meu nome é João Silva, CPF 12345678900"

echo "=== 7. TESTE: VISITAS ==="
send_msg "posso visitar o apartamento?"
send_msg "quero visitar amanhã às 14h"

echo "=== 8. TESTE: RESERVA ==="
send_msg "quero confirmar a reserva"

echo "=== 9. TESTE: CLASSIFICAÇÃO LEAD ==="
send_msg "adorei, está perfeito\!"
send_msg "muito caro, não serve"

echo "=== 10. TESTE: MEMÓRIA ==="
send_msg "você lembra o que eu pedi?"

echo "=== 11. TESTE: NATURALIDADE ==="
send_msg "oi, tudo bem?"
send_msg "obrigado\!"

echo "========================================="
echo "         TESTES FINALIZADOS             "
echo "========================================="
