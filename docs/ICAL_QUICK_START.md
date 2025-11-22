# iCal Sync - Guia Rápido de Uso

## 🎯 Objetivo

Sincronizar calendários bidirecionalmente entre Locai e Airbnb (ou outras plataformas).

---

## 📥 Importar Reservas do Airbnb para o Locai

### Passo a Passo:

1. **Acesse a propriedade no Locai**
   - Dashboard → Propriedades → Editar propriedade
   - Aba "Disponibilidade" → "iCal Sync"

2. **Obtenha o ID da propriedade no Airbnb**
   - Cole a URL completa da propriedade do Airbnb
   - Exemplo: `https://www.airbnb.com.br/rooms/1537685406266226838?adults=2...`
   - O sistema extrai automaticamente o ID: `1537685406266226838`

3. **Acesse as configurações do Airbnb**
   - Clique no botão "Abrir Configurações do Airbnb"
   - Ou acesse: `https://www.airbnb.com.br/multicalendar/[ID]/availability-settings/sharing-settings/import-calendar`

4. **Copie o link iCal do Airbnb**
   - Na página do Airbnb, procure por "Exportar calendário"
   - Copie o link que termina em `.ics?s=...`

5. **Configure a importação no Locai**
   - Cole o link iCal no campo "Passo 3"
   - Clique em "Configurar Importação"
   - Aguarde a sincronização inicial (pode levar alguns segundos)

### ✅ Resultado:
- Todas as reservas do Airbnb aparecem automaticamente no Locai
- Datas ocupadas ficam bloqueadas
- Cliente genérico "Reserva Externa - AIRBNB" é criado
- Sincronização diária automática configurada

---

## 📤 Exportar Reservas do Locai para o Airbnb

### Passo a Passo:

1. **Gere o link de exportação**
   - Acesse: Dashboard → Propriedades → Editar → Disponibilidade → iCal Sync
   - Clique em "Gerar Link de Exportação"
   - Copie o link gerado

2. **Importe no Airbnb**
   - Acesse as configurações de calendário do Airbnb
   - Procure por "Importar calendário" ou "Import calendar"
   - Cole o link do Locai
   - Dê um nome: "Locai - [Nome da Propriedade]"
   - Salve

### ✅ Resultado:
- Airbnb sincroniza automaticamente com o Locai
- Datas reservadas no Locai ficam bloqueadas no Airbnb
- Atualização a cada 24 horas (limitação do Airbnb)

---

## 🔄 Sincronização Manual

Para forçar uma sincronização imediata:

1. Acesse a propriedade no Locai
2. Vá para "iCal Sync"
3. Clique em "Sincronizar Agora"
4. Aguarde a confirmação

---

## ⚠️ Importante

### Limitações do Airbnb:
- Airbnb sincroniza calendários importados **a cada 24 horas**
- Mudanças podem levar até 1 dia para aparecer

### Evite Conflitos:
- Configure importação E exportação para sincronização completa
- Não reserve a mesma data manualmente nas duas plataformas
- Use sempre o sistema para criar reservas

### Segurança:
- Nunca compartilhe o link de exportação publicamente
- Cada link tem um token de segurança único
- Pode regenerar o token a qualquer momento (o link antigo para de funcionar)

---

## 🆘 Problemas Comuns

### "URL do iCal inválida"
**Solução**: Verifique que a URL:
- Começa com `https://`
- Termina com `.ics` ou contém `/calendar/ical/`
- Foi copiada corretamente (sem espaços)

### "Propriedade não encontrada no Airbnb"
**Solução**: Verifique que:
- A URL do Airbnb está correta
- Contém `/rooms/` no caminho
- O ID tem apenas números

### "Reservas duplicadas"
**Solução**:
- O sistema previne automaticamente duplicatas
- Se ocorrer, entre em contato com o suporte

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação completa em `docs/ICAL_SYNC_SYSTEM.md`
2. Consulte os logs de sincronização no sistema
3. Entre em contato com o suporte técnico

---

**Última atualização**: 2025-01-21
