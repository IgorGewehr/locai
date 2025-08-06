# 🧪 Cenários de Teste - Few-Shot Prompting Sofia

## 📋 Objetivo
Validar que o Few-Shot Prompting implementado está funcionando corretamente, comparando:
- **Antes**: Respostas sem exemplos específicos
- **Depois**: Respostas com exemplos detalhados no prompt

## 🎯 Cenários de Teste Críticos

### 1. 🔍 **Primeira Busca Básica**
```
Input: "Oi, quero alugar um apartamento"
Expectativa com Few-Shot:
✅ Executa search_properties automaticamente
✅ Resposta: "Oi! 😊 Que bom! Vou mostrar nossas opções de apartamentos!"  
✅ Após resultado: "Encontrei algumas opções incríveis! 🏠 Esse no centro acomoda 4 pessoas..."
✅ Pergunta próximo passo: "Quer ver fotos? 📸"
❌ SEM Few-Shot: Pode apenas dar informações gerais sem executar função
```

### 2. 📸 **Pedido de Mídia**
```
Input: "Tem fotos dessa casa?"
Expectativa com Few-Shot:
✅ Executa send_property_media automaticamente
✅ Resposta: "Claro! Vou mandar as fotos agora! 📸"
✅ Após resultado: "Olha que linda! 😍 Aqui estão as fotos..."
❌ SEM Few-Shot: Pode pedir mais informações ao invés de executar
```

### 3. 📊 **Orçamento Específico**
```
Input: "Quanto fica do dia 15 ao 20 de março para 4 pessoas?"
Expectativa com Few-Shot:
✅ Executa generate_quote (não calculate_price!)
✅ Resposta: "Ótimo! Vou fazer um orçamento completo! 📊"
✅ Formato exato: "5 noites: R$ 1.500 + limpeza R$ 120 = R$ 1.620. Via PIX: R$ 1.458 (10% desconto)!"
❌ SEM Few-Shot: Pode usar calculate_price ou pedir mais dados
```

### 4. 👤 **Registro Automático**
```
Input: "Meu nome é João Silva, telefone 48999887766"
Expectativa com Few-Shot:
✅ Executa register_client automaticamente
✅ Resposta: "Prazer, João! Vou registrar seus dados! 👤"
✅ Após resultado: "Pronto! Dados salvos! 😊 Agora posso personalizar..."
❌ SEM Few-Shot: Pode apenas agradecer sem registrar
```

### 5. 🎯 **Fluxo Completo de Reserva**
```
Input: "Quero fechar essa reserva"
Expectativa com Few-Shot:
✅ Executa generate_quote primeiro
✅ Depois executa create_reservation  
✅ Resposta: "Que bom! Vou processar sua reserva! 🎯"
✅ Após resultado: "Reserva criada! 🎉 Total: R$ 1.620. Prefere PIX, cartão ou transferência?"
❌ SEM Few-Shot: Pode pedir confirmações desnecessárias
```

### 6. 💳 **Pagamento Direto**
```
Input: "Vou pagar via PIX"  
Expectativa com Few-Shot:
✅ Executa create_transaction automaticamente
✅ Resposta: "Perfeito! PIX é mais rápido e tem desconto! 💳"
✅ Após resultado: "Pronto! 💚 Entrada: R$ 146 (10%). Em breve recebe os dados..."
❌ SEM Few-Shot: Pode dar explicações genéricas sobre PIX
```

### 7. 🎯 **Classificação Automática**
```
Input: "Nossa, adorei essa casa! Bem dentro do orçamento"
Expectativa com Few-Shot:
✅ Executa classify_lead automaticamente em paralelo
✅ Resposta natural: "Que alegria! Essa casa é especial! 😍"
✅ Pergunta próxima: "É uma das favoritas! 🌟 Quer agendar visita ou partir para reserva?"
❌ SEM Few-Shot: Pode não classificar o lead ou ser menos natural
```

## 📊 Métricas de Sucesso

### **Taxa de Execução de Funções**
- **Meta com Few-Shot**: 95%+ das mensagens geram pelo menos 1 função
- **Antes**: ~70% execução de funções  
- **Esperado Depois**: ~95% execução de funções

### **Naturalidade das Respostas**
- **Meta**: 0% de linguagem técnica ("executei função", "processando")
- **Padrão**: Máximo 3 linhas, sempre com emoji, pergunta próximo passo

### **Precisão de Função**
- **Meta**: Função correta escolhida em 90%+ dos casos
- **Prioridades**: generate_quote > calculate_price sempre respeitada

### **Fluxo Comercial**
- **Meta**: 80%+ das interações avançam no funil de vendas
- **Medição**: classify_lead executado, leads movem status

## 🧪 Como Testar

### 1. **Teste Manual na Interface**
```bash
# Acesse /dashboard/ai-testing
# Teste cada cenário acima
# Compare com comportamento anterior
```

### 2. **Logs de Função**
```bash
# Verifique logs em lib/utils/logger.ts
# Procure por "function executed" para cada teste
# Confirme que as funções corretas foram chamadas
```

### 3. **Análise de Resposta**
```bash
# Verifique se seguem o padrão:
# ✅ Confirmação entusiasmada
# ✅ Destaque do resultado principal
# ✅ Pergunta para próximo passo  
# ✅ Máximo 2-3 linhas
# ✅ Emoji relevante
```

## 🎯 Resultados Esperados

### **Melhoria na Experiência do Cliente**
- Respostas mais rápidas e diretas
- Menos perguntas desnecessárias  
- Fluxo mais fluido até a conversão

### **Melhoria na Performance do Agente**
- Mais funções executadas por conversa
- Menos tokens desperdiçados em indecisão
- Melhor classificação e acompanhamento de leads

### **Melhoria na Taxa de Conversão**
- Mais leads qualificados automaticamente
- Fluxo de reserva mais eficiente
- Menos abandono por fricção desnecessária

## 📈 Próximos Passos Após Validação

1. **Monitoramento Contínuo**: Acompanhar métricas por 1 semana
2. **Ajustes Finos**: Refinar exemplos baseados em casos reais
3. **Expansão**: Adicionar mais cenários específicos do negócio
4. **A/B Testing**: Comparar versões com diferentes níveis de exemplos