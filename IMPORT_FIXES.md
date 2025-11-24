# Correções no Sistema de Importação de Propriedades do Airbnb

## 🐛 Problemas Identificados

1. **PropertyCompletionDialog** - Handler `handleComplete` estava engolindo exceções silenciosamente
2. **PropertyImportDialog** - Handler `handlePropertyCompletion` tinha lógica duplicada de definição de resultado
3. **PropertyImportWizard** - Handler `handlePropertyCompletion` estava mudando o step antes de fechar o dialog
4. **Mapeamento de campos** - Campos aninhados (`guestCapacity`) não eram mapeados corretamente

## ✅ Correções Aplicadas

### 1. PropertyCompletionDialog.tsx

**Problema:** O handler não mostrava erros ao usuário e não incluía datas indisponíveis

**Solução:**
```typescript
// ANTES
const handleComplete = async () => {
  setSaving(true);
  try {
    const formData = methods.getValues();
    await onComplete(formData);
  } catch (error) {
    console.error('Error completing property:', error);
  } finally {
    setSaving(false);
  }
};

// DEPOIS
const handleComplete = async () => {
  setSaving(true);
  try {
    const formData = methods.getValues();

    // Add unavailable dates from calendar selection
    if (selectedDates.length > 0) {
      formData.unavailableDates = selectedDates.map(d => d.toISOString());
    }

    // Debug logging
    console.log('[PropertyCompletionDialog] Submitting property data:', {...});

    await onComplete(formData);
    console.log('[PropertyCompletionDialog] Property saved successfully');
  } catch (error) {
    console.error('[PropertyCompletionDialog] Error completing property:', error);
    // Show error to user instead of silent fail
    alert(
      'Erro ao salvar propriedade:\n' +
      (error instanceof Error ? error.message : 'Erro desconhecido')
    );
  } finally {
    setSaving(false);
  }
};
```

**Melhorias:**
- ✅ Adiciona datas indisponíveis selecionadas no calendário
- ✅ Logs detalhados para debug
- ✅ Mostra erros ao usuário via alert (não silenciosamente)

### 2. Mapeamento de Campos

**Problema:** Campos aninhados não eram extraídos corretamente do `propertyData`

**Solução:**
```typescript
// ANTES
defaultValues: {
  ...propertyData,
  basePrice: propertyData.basePrice || 200,
  // ...
}

// DEPOIS
defaultValues: {
  ...propertyData,
  // Ensure nested fields are properly flattened
  title: propertyData.title || propertyData.name || 'Nova Propriedade',
  bedrooms: propertyData.bedrooms || propertyData.guestCapacity?.bedrooms || 1,
  bathrooms: propertyData.bathrooms || propertyData.guestCapacity?.bathrooms || 1,
  maxGuests: propertyData.maxGuests || propertyData.guestCapacity?.guests || 2,
  capacity: propertyData.capacity || propertyData.guestCapacity?.guests || 2,
  // Pricing defaults
  basePrice: propertyData.basePrice || 200,
  // ...
}
```

**Melhorias:**
- ✅ Extrai corretamente campos aninhados de `guestCapacity`
- ✅ Fallback para múltiplas variações de nomes de campos
- ✅ Garante valores padrão adequados

### 3. PropertyImportDialog.tsx

**Problema:** Lógica duplicada ao definir resultado de sucesso

**Solução:**
```typescript
// ANTES
// Tinha 3 setResult() chamados em sequência com lógica confusa

// DEPOIS
// Step 2: Close completion dialog
setShowCompletionDialog(false);

// Step 3: Configure iCal sync if URL provided
let syncResultMessage = 'Propriedade criada com sucesso!';
let eventsImported = 0;

if (iCalUrl && iCalValidation?.valid) {
  // ... lógica de sync
  // Atualiza syncResultMessage baseado no resultado
}

// Step 4: Show success and move to final step (UMA VEZ SÓ)
setActiveStep(4);
setResult({
  success: true,
  message: syncResultMessage,
  result: {
    createdProperties: [completedData.title || 'Propriedade'],
    skippedProperties: [],
    eventsImported,
  },
});
```

**Melhorias:**
- ✅ Remove lógica duplicada
- ✅ Fecha o dialog antes de configurar sync
- ✅ Define resultado uma única vez no final
- ✅ Logs detalhados para debug

### 4. PropertyImportWizard.tsx

**Problema:** Mudava o step antes de fechar o dialog, causando inconsistências visuais

**Solução:**
```typescript
// ANTES
setActiveStep(4); // Move to final step
setLoading(true);
// ... create property
setShowCompletionDialog(false);

// DEPOIS
setLoading(true);
// ... create property
// Close completion dialog first
setShowCompletionDialog(false);
// ... iCal sync
// Move to success step (no final)
setActiveStep(4);
```

**Melhorias:**
- ✅ Ordem correta: criar → fechar dialog → sync iCal → mostrar sucesso
- ✅ UX mais fluida sem mudanças visuais estranhas

### 5. Exibição de Dados no Review Step

**Problema:** Campos de endereço e capacidade não eram exibidos corretamente

**Solução:**
```typescript
// ANTES
<Typography variant="body2" color="text.secondary">
  {propertyData.address?.city}, {propertyData.address?.state}
</Typography>
// ...
<Typography variant="h6">
  {propertyData.guestCapacity?.bedrooms || 0}
</Typography>

// DEPOIS
<Typography variant="body2" color="text.secondary">
  {propertyData.city || propertyData.address?.city || ''}
  {propertyData.neighborhood ? `, ${propertyData.neighborhood}` : ''}
</Typography>
// ...
<Typography variant="h6">
  {propertyData.bedrooms || propertyData.guestCapacity?.bedrooms || 0}
</Typography>
```

**Melhorias:**
- ✅ Fallback para múltiplos formatos de dados
- ✅ Exibe informações corretamente mesmo com estruturas diferentes

## 🧪 Como Testar

1. **Importar propriedade com iCal completo:**
   ```
   1. Acessar /dashboard/properties
   2. Clicar em "Importar Propriedade"
   3. Colar URL do Airbnb
   4. Colar URL do iCal
   5. Clicar em "Importar"
   6. Preencher preços no dialog de completar
   7. Clicar em "Salvar Propriedade"
   8. ✅ Verificar se salva e sincroniza
   ```

2. **Verificar logs no console:**
   ```
   - [PropertyImportDialog] Starting property completion with data: {...}
   - [PropertyCompletionDialog] Submitting property data: {...}
   - [PropertyImportDialog] Property created: {...}
   - [PropertyImportDialog] Property ID: xxx
   - [PropertyCompletionDialog] Property saved successfully
   ```

3. **Verificar erros:**
   ```
   - Se houver erro, deve mostrar alert com mensagem clara
   - Logs de erro devem aparecer no console com prefixo
   - Botão "Salvando..." deve voltar para "Salvar Propriedade"
   ```

## 📝 Logs de Debug Adicionados

Todos os logs seguem o padrão:
```typescript
console.log('[ComponentName] Ação descritiva', { dados: relevantes });
console.error('[ComponentName] Erro descritivo', error);
```

### Logs no PropertyCompletionDialog:
- `[PropertyCompletionDialog] Submitting property data: {...}`
- `[PropertyCompletionDialog] Property saved successfully`
- `[PropertyCompletionDialog] Error completing property: ...`

### Logs no PropertyImportDialog:
- `[PropertyImportDialog] Starting property completion with data: {...}`
- `[PropertyImportDialog] Sending property to API...`
- `[PropertyImportDialog] API error: {...}`
- `[PropertyImportDialog] Property created: {...}`
- `[PropertyImportDialog] Property ID: xxx`

## 🎯 Arquivos Modificados

1. `components/organisms/PropertyCompletionDialog/PropertyCompletionDialog.tsx`
   - Handler `handleComplete` com tratamento de erros
   - Mapeamento correto de campos no formulário
   - Exibição correta de dados no review step

2. `components/organisms/PropertyImport/PropertyImportDialog.tsx`
   - Handler `handlePropertyCompletion` simplificado
   - Logs de debug detalhados
   - Ordem correta de operações

3. `components/organisms/PropertyImportWizard/PropertyImportWizard.tsx`
   - Handler `handlePropertyCompletion` com ordem correta
   - Fecha dialog antes de mudar step

## 🔍 Próximos Passos (Se Ainda Falhar)

Se após essas correções ainda houver problemas:

1. **Verificar console do navegador** para logs detalhados
2. **Verificar Network tab** para ver requisições HTTP falhando
3. **Verificar se o token JWT está válido** (pode estar expirado)
4. **Verificar estrutura de dados do Airbnb** - pode ter mudado
5. **Verificar permissões do Firestore** - pode estar bloqueando escrita

## 📞 Suporte

Qualquer problema adicional, verificar:
- Console do navegador (F12 → Console)
- Network tab (F12 → Network)
- Logs do servidor (se houver)
