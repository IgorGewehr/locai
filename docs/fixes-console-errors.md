# Correções de Erros do Console - Janeiro 2025

## Problemas Corrigidos

### 1. MUI Tooltip com Botões Desabilitados

**Problema**: 
```
MUI: You are providing a disabled `button` child to the Tooltip component.
A disabled element does not fire events.
```

**Solução**: Envolver botões desabilitados em `<span>` quando usados com Tooltip.

**Arquivos Corrigidos**:
- `/components/organisms/marketing/MiniSiteWidget.tsx`
- `/app/dashboard/crm/components/AIInsights.tsx`
- `/components/templates/dashboards/EnhancedFinancialDashboard.tsx` (já estava correto)

**Exemplo de Correção**:
```tsx
// Antes
<Tooltip title="Abrir Mini-Site">
  <IconButton disabled={!active}>
    <OpenInNew />
  </IconButton>
</Tooltip>

// Depois
<Tooltip title="Abrir Mini-Site">
  <span>
    <IconButton disabled={!active}>
      <OpenInNew />
    </IconButton>
  </span>
</Tooltip>
```

### 2. Aninhamento HTML Inválido (p dentro de p)

**Problema**:
```
In HTML, <p> cannot be a descendant of <p>.
In HTML, <div> cannot be a descendant of <p>.
```

**Solução**: Usar React Fragment e `secondaryTypographyProps={{ component: 'div' }}` no ListItemText.

**Arquivo Corrigido**:
- `/app/dashboard/crm/components/AIInsights.tsx`

**Exemplo de Correção**:
```tsx
// Antes
<ListItemText
  secondary={
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2">
        {text}
      </Typography>
    </Box>
  }
/>

// Depois
<ListItemText
  secondary={
    <>
      {text}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        {/* conteúdo */}
      </Stack>
    </>
  }
  secondaryTypographyProps={{ component: 'div' }}
/>
```

## Recomendações para Evitar Estes Erros

1. **Sempre envolver botões desabilitados em `<span>` quando usar Tooltip**
2. **Evitar elementos block (div, p) dentro de elementos inline (p)**
3. **Usar `secondaryTypographyProps={{ component: 'div' }}` quando o conteúdo secondary do ListItemText contém elementos block**
4. **Validar HTML semanticamente correto para evitar problemas de hidratação**

## Verificação

Para verificar se existem mais ocorrências destes problemas:

```bash
# Verificar Tooltips com disabled sem span
grep -r "Tooltip.*disabled" --include="*.tsx" --include="*.jsx" | grep -v "<span>"

# Verificar ListItemText com Box/Typography no secondary
grep -r "secondary={.*<Box" --include="*.tsx" --include="*.jsx"
```