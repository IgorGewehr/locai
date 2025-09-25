# 📊 Funções de Métricas para Sofia AI

## Visão Geral

Estas funções permitem que a Sofia acesse, analise e monitore as métricas de conversação em tempo real, fornecendo insights inteligentes sobre o desempenho do atendimento.

---

## 📈 **1. get-analytics-dashboard**

**Função**: Obtém dashboard completo de analytics de conversação

**Endpoint**: `POST /api/ai/functions/get-analytics-dashboard`

### Parâmetros
```json
{
  "tenantId": "tenant_123",
  "period": "7d",           // 24h, 7d, 30d, 90d
  "includeHeatmap": true,   // Incluir dados de heatmap
  "includeTrends": true     // Incluir dados de tendência
}
```

### Resposta
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalConversations": 1247,
      "conversionRate": 24.8,
      "avgQualificationTime": 3.2,
      "avgConversationTime": 4.6,
      "responseRate": 89.3
    },
    "trends": {
      "conversions": {
        "current": 24.8,
        "change": 12.3,
        "trend": "up"
      },
      "qualification": {
        "current": 3.2,
        "change": -8.5,
        "trend": "up"
      },
      "engagement": {
        "current": 89.3,
        "change": 7.1,
        "trend": "up"
      }
    },
    "insights": [
      "🎉 Taxa de conversão aumentou 12.3% no período!",
      "⚡ Qualificação muito rápida! Média de 3.2 minutos"
    ],
    "heatmap": {
      "peakHours": "14h-15h",
      "peakDays": "Qui",
      "totalData": 168
    },
    "recentTrends": [...],
    "period": "7d",
    "lastUpdate": "2024-01-15T10:30:00Z"
  }
}
```

### Uso no N8N
```javascript
// Sofia consulta dashboard antes de reportar performance
const dashboardData = await $http.post('/api/ai/functions/get-analytics-dashboard', {
  tenantId: tenant_id,
  period: '7d',
  includeHeatmap: true
});

const summary = dashboardData.data.summary;
const message = `📊 *Resumo de Performance (7 dias)*

🗣️ *Conversas:* ${summary.totalConversations}
📈 *Taxa de Conversão:* ${summary.conversionRate}%
⚡ *Tempo p/ Qualificar:* ${summary.avgQualificationTime} min
💬 *Taxa de Resposta:* ${summary.responseRate}%

${dashboardData.data.insights.join('\n')}`;
```

---

## 📊 **2. track-conversation-metric**

**Função**: Registra métricas de conversação em tempo real

**Endpoint**: `POST /api/ai/functions/track-conversation-metric`

### Parâmetros
```json
{
  "tenantId": "tenant_123",
  "eventType": "qualification_milestone",  // conversion_step, qualification_milestone, message_engagement, conversation_session
  "leadId": "lead_456",
  "sessionId": "session_789",             // opcional
  "messageId": "msg_123",                 // opcional
  "eventData": {
    "milestone": "qualified",
    "timeToMilestone": 180,               // segundos
    "messageCount": 8
  },
  "autoTrack": true
}
```

### Tipos de Eventos

#### **conversion_step**
```json
{
  "eventType": "conversion_step",
  "leadId": "lead_123",
  "eventData": {
    "from": "contacted",
    "to": "qualified",
    "conversionValue": 5000
  }
}
```

#### **qualification_milestone**
```json
{
  "eventType": "qualification_milestone",
  "leadId": "lead_123",
  "eventData": {
    "milestone": "qualified",
    "timeToMilestone": 180,
    "messageCount": 8
  }
}
```

#### **message_engagement**
```json
{
  "eventType": "message_engagement",
  "sessionId": "session_456",
  "leadId": "lead_123",
  "eventData": {
    "outcome": "responded",
    "responseTime": 45,
    "engagementLevel": "active"
  }
}
```

#### **conversation_session**
```json
{
  "eventType": "conversation_session",
  "sessionId": "session_456",
  "leadId": "lead_123",
  "eventData": {
    "duration": 270,
    "messageCount": 12,
    "outcome": "qualified"
  }
}
```

### Resposta
```json
{
  "success": true,
  "data": {
    "metricId": "metric_789",
    "eventType": "qualification_milestone",
    "tracked": true,
    "timestamp": "2024-01-15T10:30:00Z",
    "context": "Lead qualificado com sucesso em 3 minutos - pode prosseguir para apresentação"
  }
}
```

### Uso no N8N
```javascript
// Sofia rastreia quando qualifica um lead
await $http.post('/api/ai/functions/track-conversation-metric', {
  tenantId: tenant_id,
  eventType: 'qualification_milestone',
  leadId: lead_id,
  eventData: {
    milestone: 'qualified',
    timeToMilestone: conversation_time_seconds,
    messageCount: message_count
  }
});

// Sofia rastreia conversão no pipeline
await $http.post('/api/ai/functions/track-conversation-metric', {
  tenantId: tenant_id,
  eventType: 'conversion_step',
  leadId: lead_id,
  eventData: {
    from: 'qualified',
    to: 'visit_scheduled'
  }
});
```

---

## 🔍 **3. get-business-insights**

**Função**: Gera insights inteligentes e recomendações de negócio

**Endpoint**: `POST /api/ai/functions/get-business-insights`

### Parâmetros
```json
{
  "tenantId": "tenant_123",
  "insightType": "all",              // all, performance, opportunities, alerts
  "period": "7d",
  "includeRecommendations": true,
  "focusArea": "general"             // general, conversion, engagement, efficiency
}
```

### Resposta
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalInsights": 4,
      "alertsCount": 1,
      "opportunitiesCount": 2,
      "recommendationsCount": 3,
      "overallHealth": {
        "score": 78,
        "level": "good",
        "breakdown": {
          "conversion": 85,
          "engagement": 92,
          "efficiency": 58
        }
      }
    },
    "insights": [
      {
        "category": "performance",
        "type": "positive",
        "title": "Conversão em alta",
        "description": "Taxa de conversão aumentou 12.3% no período",
        "impact": "high",
        "value": 24.8,
        "change": 12.3
      }
    ],
    "alerts": [
      {
        "severity": "warning",
        "type": "slow_qualification",
        "title": "Qualificação muito lenta",
        "description": "Levando 15.2 minutos para qualificar",
        "action": "Simplificar processo de qualificação",
        "urgency": "medium"
      }
    ],
    "opportunities": [
      {
        "type": "growth",
        "title": "Acelerar crescimento da conversão",
        "description": "Conversão crescendo 12.3% - momento de intensificar",
        "potential": "high",
        "effort": "medium",
        "action": "Aumentar volume de leads ou otimizar processo"
      }
    ],
    "recommendations": [
      {
        "category": "efficiency",
        "priority": "medium",
        "title": "Otimizar processo de qualificação",
        "actions": [
          "Simplificar perguntas de qualificação",
          "Implementar qualificação progressiva"
        ],
        "expectedImpact": "30-40% redução no tempo",
        "timeframe": "1-2 semanas"
      }
    ],
    "actionableItems": [
      {
        "type": "quick_win",
        "title": "Acelerar crescimento da conversão",
        "action": "Aumentar volume de leads ou otimizar processo",
        "deadline": "1 semana"
      }
    ],
    "benchmarks": {
      "conversionRate": {
        "current": 24.8,
        "industry": 25,
        "excellent": 35,
        "status": "good"
      }
    },
    "nextSteps": [
      {
        "priority": 1,
        "action": "Implementar quick wins",
        "description": "Aproveitar oportunidades de baixo esforço e alto impacto",
        "timeline": "1-2 semanas"
      }
    ]
  }
}
```

### Uso no N8N
```javascript
// Sofia gera relatório de insights
const insights = await $http.post('/api/ai/functions/get-business-insights', {
  tenantId: tenant_id,
  insightType: 'all',
  period: '30d',
  includeRecommendations: true
});

const health = insights.data.summary.overallHealth;
const message = `🎯 *Análise de Performance (30 dias)*

📊 *Saúde Geral:* ${health.score}/100 (${health.level})

*Principais Insights:*
${insights.data.insights.slice(0, 3).map(i => `• ${i.title}: ${i.description}`).join('\n')}

*Oportunidades:*
${insights.data.opportunities.slice(0, 2).map(o => `• ${o.title} (${o.potential} potential)`).join('\n')}

*Próximos Passos:*
${insights.data.nextSteps.slice(0, 2).map(s => `${s.priority}. ${s.action}`).join('\n')}`;
```

---

## 🚀 **Casos de Uso Práticos**

### **1. Sofia Reporta Performance Diária**
```javascript
// Workflow N8N: Relatório diário automático
const dashboard = await getDashboard('24h');
const insights = await getInsights('performance', '24h');

const report = `📊 *Relatório Diário*
Conversas: ${dashboard.summary.totalConversations}
Conversão: ${dashboard.summary.conversionRate}%
Qualificação: ${dashboard.summary.avgQualificationTime}min

${insights.data.insights[0]?.description || 'Dia normal de operação'}`;
```

### **2. Sofia Monitora Alertas**
```javascript
// Workflow N8N: Check alertas críticos
const insights = await getInsights('alerts', '7d');
const criticalAlerts = insights.data.alerts.filter(a => a.severity === 'critical');

if (criticalAlerts.length > 0) {
  const alert = criticalAlerts[0];
  const message = `🚨 *Alerta Crítico*
${alert.title}
${alert.description}

*Ação:* ${alert.action}
*Urgência:* ${alert.urgency}`;
}
```

### **3. Sofia Sugere Otimizações**
```javascript
// Workflow N8N: Relatório semanal de oportunidades
const insights = await getInsights('opportunities', '7d');
const quickWins = insights.data.opportunities.filter(o => o.effort === 'low');

const message = `💡 *Oportunidades da Semana*
${quickWins.map(o => `• ${o.title} - ${o.action}`).join('\n')}

Score atual: ${insights.data.summary.overallHealth.score}/100`;
```

---

## 📝 **Logs e Monitoramento**

Todas as funções geram logs estruturados:

```javascript
// Exemplo de log
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "✅ [GET-ANALYTICS-DASHBOARD] Consulta concluída",
  "requestId": "analytics_1705312200_x8k2",
  "tenantId": "tenant_***",
  "results": {
    "totalConversations": 1247,
    "conversionRate": 24.8,
    "hasHeatmap": true,
    "processingTime": "245ms"
  }
}
```

---

## 🎯 **Integração Recomendada**

1. **Dashboard Matinal**: Sofia consulta analytics e envia resumo
2. **Tracking Automático**: Todos os eventos importantes são registrados
3. **Alertas Proativos**: Sofia monitora e notifica sobre problemas
4. **Relatórios Semanais**: Insights e recomendações automáticas
5. **Otimização Contínua**: Baseada nos dados coletados

Essas funções transformam a Sofia em um assistente de business intelligence completo! 🚀