# DOSSIÊ COMPLETO DAS FUNÇÕES DO AGENTE SOFIA

## 📋 RESUMO EXECUTIVO

Este documento apresenta uma análise detalhada das funções disponíveis para as versões V3 e V4 do agente Sofia, incluindo:
- Mapeamento completo de todas as funções
- Comparação entre versões
- Análise de compatibilidade com Firebase
- Identificação de pontos de melhoria

## 🔍 ANÁLISE DAS VERSÕES

### Sofia V3 - Características Principais
- **Arquivo**: `lib/ai-agent/sofia-agent-v3.ts`
- **Modelo**: GPT-4o-mini
- **Funções**: 9 funções essenciais (agent-functions-corrected.ts)
- **Foco**: Otimização de tokens e performance
- **Arquitetura**: Singleton pattern com contexto otimizado

### Sofia V4 - Características Principais
- **Arquivo**: `lib/ai-agent/sofia-agent-v4.ts`
- **Modelo**: GPT-4o-mini
- **Funções**: 20+ funções avançadas (agent-functions-enhanced.ts)
- **Foco**: Sistema completo com cache, paralelização e otimizações
- **Arquitetura**: Multi-camada com sistemas auxiliares

## 📊 FUNÇÕES DISPONÍVEIS

### 🟢 FUNÇÕES SOFIA V3 (agent-functions-corrected.ts)

Total: **9 funções essenciais**

#### 1. **search_properties**
- **Descrição**: Buscar propriedades disponíveis com filtros básicos
- **Parâmetros obrigatórios**: `guests`
- **Parâmetros opcionais**: `location`, `budget`, `checkIn`, `checkOut`, `amenities`
- **Integração Firebase**: ✅ Usa `propertyService.searchProperties()`
- **Ordenação**: Por preço crescente (mais baratas primeiro)

#### 2. **send_property_media**
- **Descrição**: Enviar fotos e vídeos de uma propriedade
- **Parâmetros obrigatórios**: `propertyId`
- **Parâmetros opcionais**: `includeVideos`, `maxPhotos`
- **Integração Firebase**: ✅ Usa `propertyService.getById()`
- **Limite**: Máximo 8 fotos e 3 vídeos

#### 3. **get_property_details**
- **Descrição**: Obter detalhes completos de uma propriedade
- **Parâmetros obrigatórios**: `propertyId`
- **Integração Firebase**: ✅ Usa `propertyService.getById()`
- **Retorna**: Todos os campos da propriedade incluindo pricing dinâmico

#### 4. **calculate_price**
- **Descrição**: Calcular preço total para período específico
- **Parâmetros obrigatórios**: `propertyId`, `checkIn`, `checkOut`, `guests`
- **Integração Firebase**: ✅ Usa `propertyService.getById()`
- **Features**: Cálculo dinâmico com surcharges sazonais

#### 5. **register_client**
- **Descrição**: Registrar ou atualizar dados do cliente
- **Parâmetros obrigatórios**: `name`, `phone`, `document` (CPF)
- **Parâmetros opcionais**: `email`
- **Integração Firebase**: ✅ Usa `clientServiceWrapper.createOrUpdate()`
- **Deduplicação**: Por telefone

#### 6. **check_visit_availability**
- **Descrição**: Verificar horários disponíveis para visita
- **Parâmetros opcionais**: `startDate`, `days`, `timePreference`
- **Integração Firebase**: ✅ Usa `visitService.checkAvailability()`
- **Padrão**: 7 dias a partir de hoje

#### 7. **schedule_visit**
- **Descrição**: Agendar visita presencial à propriedade
- **Parâmetros obrigatórios**: `clientId`, `propertyId`, `visitDate`, `visitTime`
- **Parâmetros opcionais**: `notes`
- **Integração Firebase**: ✅ Usa `visitService.createVisit()`
- **CRM**: Atualiza lead automaticamente

#### 8. **create_reservation**
- **Descrição**: Criar nova reserva após registrar cliente
- **Parâmetros obrigatórios**: `clientId`, `propertyId`, `checkIn`, `checkOut`, `guests`, `totalPrice`
- **Parâmetros opcionais**: `notes`
- **Integração Firebase**: ✅ Usa `reservationService.create()`
- **Importante**: Atualiza disponibilidade da propriedade automaticamente

#### 9. **classify_lead_status**
- **Descrição**: Classificar automaticamente status do lead
- **Parâmetros obrigatórios**: `clientPhone`, `conversationOutcome`, `reason`
- **Parâmetros opcionais**: `metadata`
- **Integração Firebase**: ✅ Usa `crmService` completo
- **Outcomes**: 7 classificações possíveis

### 🔵 FUNÇÕES SOFIA V4 (agent-functions-enhanced.ts)

Total: **20+ funções avançadas** (arquivo muito grande, principais listadas)

#### Funções Core Mantidas (9)
- Todas as 9 funções da V3 com melhorias

#### Novas Funções Avançadas
1. **get_property_insights** - Análise de mercado e competitividade
2. **calculate_dynamic_price** - Pricing inteligente com ML
3. **analyze_customer_behavior** - Análise comportamental
4. **get_personalized_recommendations** - Recomendações com IA
5. **trigger_automation** - Disparo de automações
6. **update_lead_score** - Scoring dinâmico de leads
7. **create_follow_up_task** - Gestão de tarefas
8. **send_smart_campaign** - Campanhas inteligentes
9. **analyze_market_trends** - Análise de tendências
10. **optimize_property_listing** - Otimização de listagem
11. **predict_booking_probability** - Predição de conversão
12. **negotiate_price** - Negociação automática

## 🔄 COMPARAÇÃO V3 vs V4

### Complexidade
- **V3**: Simples e direta - 9 funções essenciais
- **V4**: Complexa - 20+ funções com sistemas auxiliares

### Performance
- **V3**: Otimizada para velocidade (1-2s resposta)
- **V4**: Múltiplas camadas podem adicionar latência

### Manutenibilidade
- **V3**: Fácil de entender e manter
- **V4**: Requer conhecimento de múltiplos sistemas

### Confiabilidade
- **V3**: Testada e estável
- **V4**: Sistemas complexos podem ter mais pontos de falha

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. Over-engineering na V4
- Sistema de cache pode ser desnecessário para MVP
- Paralelização complexa sem necessidade real
- Múltiplas camadas de abstração

### 2. Duplicação de Código
- Funções similares em arquivos diferentes
- agent-functions-corrected.ts vs agent-functions-enhanced.ts
- Imports confusos e redundantes

### 3. Inconsistências de Tipos
- Property tem campos diferentes entre versões
- Client vs CRMClient
- Mistura de padrões de data

## ✅ PONTOS FORTES

### V3
- ✅ Implementação limpa e funcional
- ✅ Todas as funções integradas com Firebase
- ✅ Validação de IDs proativa
- ✅ Contexto otimizado
- ✅ Performance comprovada

### V4
- ✅ Funcionalidades avançadas disponíveis
- ✅ Sistema de monitoramento robusto
- ✅ Potencial para escala futura
- ✅ Arquitetura modular

## 🎯 RECOMENDAÇÕES PARA MVP

### Merge Estratégico V3 + V4
1. **Base**: Usar V3 como fundação (estável e testada)
2. **Adicionar da V4**:
   - Sistema de logging estruturado
   - Métricas básicas de performance
   - Classificação automática de leads
3. **Evitar da V4**:
   - Sistema de cache complexo
   - Paralelização desnecessária
   - Funções de ML não essenciais

### Funções Essenciais para MVP (Total: 10)
1. search_properties ✅
2. send_property_media ✅
3. get_property_details ✅
4. calculate_price ✅
5. register_client ✅
6. check_visit_availability ✅
7. schedule_visit ✅
8. create_reservation ✅
9. classify_lead_status ✅
10. get_property_insights (simplificada da V4)

## 📁 ARQUIVOS PARA LIMPEZA

### Deletar
- agent-functions-corrected.ts (após merge)
- agent-functions-enhanced.ts (após merge)
- Outros arquivos duplicados em lib/ai/

### Renomear
- sofia-agent-v3.ts → sofia-agent.ts (após merge)
- Remover sufixos de versão

### Manter
- agent-functions.ts (versão final mergeada)
- conversation-context-service.ts
- Tipos essenciais

## 🚀 PRÓXIMOS PASSOS

1. **Criar versão final mergeada** combinando V3 + melhorias selecionadas da V4
2. **Limpar arquivos redundantes** e organizar estrutura
3. **Padronizar tipos** entre todos os módulos
4. **Implementar testes** para garantir funcionamento
5. **Documentar** a versão final para produção