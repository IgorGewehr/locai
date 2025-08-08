#!/bin/bash

# Script de Teste das Funções da Sofia
# =====================================

API_BASE="http://localhost:3000/api"
PHONE="+5511999888777"
TENANT="demo_tenant"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Contador de testes
TOTAL=0
PASSED=0
FAILED=0

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   TESTE COMPLETO DAS FUNÇÕES DA SOFIA ${NC}"
echo -e "${CYAN}========================================${NC}\n"

# Função para enviar mensagem
send_message() {
    local message="$1"
    local clear_context="${2:-false}"
    
    # Limpar contexto se necessário
    if [ "$clear_context" = "true" ]; then
        curl -s -X POST "$API_BASE/agent/clear-context" \
            -H "Content-Type: application/json" \
            -d "{\"clientPhone\":\"$PHONE\",\"tenantId\":\"$TENANT\"}" > /dev/null 2>&1
        echo -e "${BLUE}  [Contexto limpo]${NC}"
    fi
    
    # Enviar mensagem
    response=$(curl -s -X POST "$API_BASE/agent" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$message\",\"clientPhone\":\"$PHONE\",\"tenantId\":\"$TENANT\"}" \
        --max-time 15)
    
    echo "$response"
}

# Função para testar
test_function() {
    local test_name="$1"
    local message="$2"
    local expected="$3"
    local clear="${4:-false}"
    
    ((TOTAL++))
    echo -e "\n${YELLOW}📝 Teste $TOTAL: $test_name${NC}"
    echo -e "   Mensagem: \"$message\""
    
    response=$(send_message "$message" "$clear")
    
    # Extrair resposta da Sofia
    sofia_reply=$(echo "$response" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    functions=$(echo "$response" | grep -o '"functionsExecuted":\[[^]]*' | cut -d'[' -f2 | cut -d']' -f1)
    
    # Mostrar resposta (primeiros 150 caracteres)
    if [ -n "$sofia_reply" ]; then
        echo -e "${MAGENTA}   🤖 Sofia: ${sofia_reply:0:150}...${NC}"
    fi
    
    # Verificar se passou
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}   ✅ PASSOU - Encontrou: $expected${NC}"
        ((PASSED++))
    else
        echo -e "${RED}   ❌ FALHOU - Não encontrou: $expected${NC}"
        ((FAILED++))
    fi
    
    # Mostrar funções executadas
    if [ -n "$functions" ]; then
        echo -e "${BLUE}   ⚙️ Funções: $functions${NC}"
    fi
    
    sleep 2
}

# ========== TESTES DAS FUNÇÕES ==========

echo -e "\n${CYAN}=== 1. TESTANDO SEARCH_PROPERTIES ===${NC}"

test_function \
    "Busca simples por cidade" \
    "oi, quero alugar um apartamento em florianópolis" \
    "apartamento\|florianópolis\|cidade\|região" \
    "true"

test_function \
    "Busca com múltiplos critérios" \
    "procuro casa para 6 pessoas em bombinhas com piscina" \
    "casa\|bombinhas\|piscina\|pessoas" \
    "true"

echo -e "\n${CYAN}=== 2. TESTANDO CALCULATE_PRICE ===${NC}"

# Preparar contexto
send_message "quero um apartamento em florianópolis" "true" > /dev/null 2>&1
sleep 2

test_function \
    "Cálculo de preço com datas" \
    "quanto fica do dia 15 ao dia 20 de março de 2025?" \
    "R\$\|valor\|preço\|março"

test_function \
    "Cálculo para primeira opção" \
    "qual o preço da primeira opção para 3 diárias?" \
    "R\$\|valor\|diária\|data"

echo -e "\n${CYAN}=== 3. TESTANDO VALIDAÇÃO DE DATAS ===${NC}"

test_function \
    "Datas no passado" \
    "quero reservar de 1 a 5 de janeiro de 2024" \
    "passado\|2025\|suger\|corrig" \
    "true"

test_function \
    "Check-out antes do check-in" \
    "quero do dia 20 ao dia 15 de abril" \
    "depois\|ordem\|saída\|entrada"

echo -e "\n${CYAN}=== 4. TESTANDO SEND_PROPERTY_MEDIA ===${NC}"

# Preparar contexto
send_message "quero ver apartamentos em bombinhas" "true" > /dev/null 2>&1
sleep 2

test_function \
    "Solicitar fotos" \
    "me manda as fotos do primeiro" \
    "foto\|imagem\|send_property_media\|mídia"

echo -e "\n${CYAN}=== 5. TESTANDO GET_PROPERTY_DETAILS ===${NC}"

test_function \
    "Detalhes da propriedade" \
    "me conte mais sobre a primeira opção" \
    "quartos\|banheiros\|detalhe\|opção"

echo -e "\n${CYAN}=== 6. TESTANDO REGISTER_CLIENT ===${NC}"

test_function \
    "Registrar cliente completo" \
    "meu nome é João Silva, CPF 12345678900, email joao@teste.com" \
    "João\|registr\|dados\|CPF" \
    "true"

echo -e "\n${CYAN}=== 7. TESTANDO VISIT SCHEDULING ===${NC}"

test_function \
    "Verificar disponibilidade" \
    "posso visitar o apartamento?" \
    "visit\|horário\|disponível\|agenda"

test_function \
    "Agendar visita" \
    "quero visitar amanhã às 14h" \
    "visit\|agend\|14h\|amanhã"

echo -e "\n${CYAN}=== 8. TESTANDO CREATE_RESERVATION ===${NC}"

# Preparar contexto completo
send_message "quero alugar em florianópolis" "true" > /dev/null 2>&1
sleep 2
send_message "quanto fica de 10 a 15 de maio de 2025?" > /dev/null 2>&1
sleep 2

test_function \
    "Criar reserva" \
    "quero confirmar a reserva" \
    "reserv\|confirm\|fechad"

echo -e "\n${CYAN}=== 9. TESTANDO CLASSIFY_LEAD_STATUS ===${NC}"

test_function \
    "Lead quente" \
    "adorei! está perfeito, quero fechar agora!" \
    "ótimo\|perfeito\|parabéns\|fechar" \
    "true"

test_function \
    "Lead frio" \
    "muito caro, não serve para mim" \
    "entend\|opç\|ajud\|outro" \
    "true"

echo -e "\n${CYAN}=== 10. TESTANDO PREVENÇÃO DE LOOPS ===${NC}"

# Preparar contexto
send_message "quero apartamento em bombinhas" "true" > /dev/null 2>&1
sleep 2

echo -e "${YELLOW}📝 Teste de Loop: Enviando 'me manda as fotos' 3x seguidas${NC}"
for i in 1 2 3; do
    echo -e "   Tentativa $i/3"
    response=$(send_message "me manda as fotos")
    if echo "$response" | grep -q "já\|enviei\|acabei"; then
        echo -e "${GREEN}   ✅ Loop prevenido na tentativa $i${NC}"
    fi
    sleep 1
done

echo -e "\n${CYAN}=== 11. TESTANDO MEMÓRIA CONTEXTUAL ===${NC}"

# Limpar e estabelecer contexto
send_message "" "true" > /dev/null 2>&1

test_function \
    "Estabelecer nome" \
    "oi, meu nome é Maria Santos" \
    "Maria\|prazer\|olá"

test_function \
    "Buscar propriedades" \
    "quero alugar em florianópolis" \
    "florianópolis\|encontr\|opç"

test_function \
    "Lembrar contexto" \
    "me fale sobre a primeira que você mostrou" \
    "primeir\|opção\|apartamento"

echo -e "\n${CYAN}=== 12. TESTANDO RESPOSTAS NATURAIS ===${NC}"

test_function \
    "Saudação casual" \
    "oi, tudo bem?" \
    "oi\|olá\|tudo\|bem" \
    "true"

test_function \
    "Agradecimento" \
    "muito obrigado pela ajuda!" \
    "nada\|disposição\|prazer\|ajud" \
    "true"

test_function \
    "Pergunta fora de contexto" \
    "qual é a capital do Brasil?" \
    "ajud\|alug\|propriedad\|imóv" \
    "true"

# ========== RELATÓRIO FINAL ==========

echo -e "\n${CYAN}========================================${NC}"
echo -e "${CYAN}         RELATÓRIO FINAL                ${NC}"
echo -e "${CYAN}========================================${NC}\n"

echo -e "📊 ${YELLOW}Estatísticas:${NC}"
echo -e "   Total de testes: $TOTAL"
echo -e "   ${GREEN}Passou: $PASSED${NC}"
echo -e "   ${RED}Falhou: $FAILED${NC}"

# Calcular taxa de sucesso
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "   Taxa de sucesso: ${SUCCESS_RATE}%"
    
    echo -e "\n📈 ${YELLOW}Resultado:${NC}"
    if [ $SUCCESS_RATE -eq 100 ]; then
        echo -e "   ${GREEN}🎉 PERFEITO! Todos os testes passaram!${NC}"
    elif [ $SUCCESS_RATE -ge 80 ]; then
        echo -e "   ${GREEN}✅ BOM! A maioria dos testes passou.${NC}"
    elif [ $SUCCESS_RATE -ge 60 ]; then
        echo -e "   ${YELLOW}⚠️ REGULAR. Alguns ajustes necessários.${NC}"
    else
        echo -e "   ${RED}❌ CRÍTICO! Muitos testes falharam.${NC}"
    fi
fi

# Salvar relatório
REPORT_FILE="sofia-test-report-$(date +%Y%m%d-%H%M%S).txt"
echo "========================================" > "$REPORT_FILE"
echo "RELATÓRIO DE TESTES - SOFIA V2" >> "$REPORT_FILE"
echo "Data: $(date)" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "Total: $TOTAL" >> "$REPORT_FILE"
echo "Passou: $PASSED" >> "$REPORT_FILE"
echo "Falhou: $FAILED" >> "$REPORT_FILE"
echo "Taxa de Sucesso: ${SUCCESS_RATE}%" >> "$REPORT_FILE"

echo -e "\n📄 Relatório salvo em: ${BLUE}$REPORT_FILE${NC}"