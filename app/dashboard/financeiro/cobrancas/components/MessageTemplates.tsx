'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Alert,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  FormHelperText,
} from '@mui/material';
import {
  Edit,
  Preview,
  Save,
  Cancel,
  Info,
  Message,
  BusinessCenter,
  People,
  ContentCopy,
  Check,
} from '@mui/icons-material';
import { BillingSettings, BillingTemplate, TEMPLATE_VARIABLES } from '@/lib/types/billing';

interface MessageTemplatesProps {
  settings: BillingSettings | null;
  onChange: (updates: Partial<BillingSettings>) => void;
}

const templateTypes = [
  { key: 'beforeDue', label: 'Antes do Vencimento', color: 'info' },
  { key: 'onDue', label: 'No Vencimento', color: 'warning' },
  { key: 'overdue', label: 'Após Vencimento', color: 'error' },
  { key: 'receipt', label: 'Confirmação de Pagamento', color: 'success' },
] as const;

export default function MessageTemplates({ settings, onChange }: MessageTemplatesProps) {
  const [editingTemplate, setEditingTemplate] = useState<keyof typeof settings.templates | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<keyof typeof settings.templates | null>(null);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  if (!settings) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Carregando configurações...
        </Typography>
      </Box>
    );
  }

  const handleTemplateChange = (templateKey: keyof typeof settings.templates, field: keyof BillingTemplate, value: any) => {
    onChange({
      templates: {
        ...settings.templates,
        [templateKey]: {
          ...settings.templates[templateKey],
          [field]: value,
        }
      }
    });
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  const renderTemplatePreview = (template: BillingTemplate) => {
    const sampleData = {
      clientName: 'João Silva',
      amount: 'R$ 1.500,00',
      dueDate: '10/01/2024',
      propertyName: 'Casa de Praia - Ubatuba',
      period: '05/01 a 10/01',
      paymentLink: 'https://pay.locai.com/abc123',
      companyName: 'Sua Imobiliária',
      updatedAmount: 'R$ 1.530,00',
      daysOverdue: '3',
      paymentDate: '12/01/2024',
    };

    let message = template.message;
    Object.entries(sampleData).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return message;
  };

  return (
    <Grid container spacing={3}>
      {/* Variáveis Disponíveis */}
      <Grid item xs={12}>
        <Alert severity="info" icon={<Info />}>
          <Typography variant="subtitle2" gutterBottom>
            Variáveis disponíveis para personalizar suas mensagens:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {Object.entries(TEMPLATE_VARIABLES).map(([key, description]) => (
              <Chip
                key={key}
                label={`{{${key}}}`}
                size="small"
                variant="outlined"
                onClick={() => copyVariable(key)}
                icon={copiedVariable === key ? <Check /> : <ContentCopy />}
                title={description}
              />
            ))}
          </Box>
        </Alert>
      </Grid>

      {/* Templates */}
      {templateTypes.map(({ key, label, color }) => {
        const template = settings.templates[key as keyof typeof settings.templates];
        const isEditing = editingTemplate === key;

        return (
          <Grid item xs={12} md={6} key={key}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Message sx={{ mr: 1, color: `${color}.main` }} />
                    <Typography variant="h6">{label}</Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => setPreviewTemplate(key as keyof typeof settings.templates)}
                      title="Visualizar"
                    >
                      <Preview />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setEditingTemplate(isEditing ? null : key as keyof typeof settings.templates)}
                      title={isEditing ? 'Fechar' : 'Editar'}
                    >
                      {isEditing ? <Cancel /> : <Edit />}
                    </IconButton>
                  </Box>
                </Box>

                {isEditing ? (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      label="Mensagem"
                      value={template.message}
                      onChange={(e) => handleTemplateChange(key as keyof typeof settings.templates, 'message', e.target.value)}
                      helperText="Use as variáveis acima para personalizar a mensagem"
                      sx={{ mb: 2 }}
                    />
                    
                    <ToggleButtonGroup
                      value={template.tone}
                      exclusive
                      onChange={(_, value) => value && handleTemplateChange(key as keyof typeof settings.templates, 'tone', value)}
                      fullWidth
                      sx={{ mb: 2 }}
                    >
                      <ToggleButton value="formal">
                        <BusinessCenter sx={{ mr: 1 }} />
                        Formal
                      </ToggleButton>
                      <ToggleButton value="friendly">
                        <People sx={{ mr: 1 }} />
                        Amigável
                      </ToggleButton>
                      <ToggleButton value="neutral">
                        Neutro
                      </ToggleButton>
                    </ToggleButtonGroup>

                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Save />}
                      onClick={() => setEditingTemplate(null)}
                    >
                      Salvar Template
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {template.message.substring(0, 150)}...
                      </Typography>
                    </Paper>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={template.tone === 'formal' ? 'Formal' : template.tone === 'friendly' ? 'Amigável' : 'Neutro'} 
                        size="small" 
                      />
                      {template.includePaymentLink && (
                        <Chip label="Link de pagamento" size="small" color="primary" />
                      )}
                      {template.includeInvoice && (
                        <Chip label="Fatura anexa" size="small" color="secondary" />
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}

      {/* Configurações Adicionais */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configurações de Mensagem
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Importante:</strong> Mensagens muito longas podem ser cortadas no WhatsApp. 
                Recomendamos manter as mensagens concisas e diretas.
              </Typography>
            </Alert>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Assinatura padrão</InputLabel>
                  <Select
                    value="company"
                    label="Assinatura padrão"
                  >
                    <MenuItem value="company">Nome da empresa</MenuItem>
                    <MenuItem value="agent">Nome do agente</MenuItem>
                    <MenuItem value="both">Empresa e agente</MenuItem>
                  </Select>
                  <FormHelperText>Como as mensagens serão assinadas</FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Formato de links</InputLabel>
                  <Select
                    value="short"
                    label="Formato de links"
                  >
                    <MenuItem value="short">Link curto (recomendado)</MenuItem>
                    <MenuItem value="full">Link completo</MenuItem>
                    <MenuItem value="button">Botão do WhatsApp</MenuItem>
                  </Select>
                  <FormHelperText>Como os links de pagamento aparecerão</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Dialog de Preview */}
      <Dialog 
        open={previewTemplate !== null} 
        onClose={() => setPreviewTemplate(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Preview da Mensagem
          {previewTemplate && (
            <Chip 
              label={templateTypes.find(t => t.key === previewTemplate)?.label} 
              size="small" 
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {previewTemplate && (
            <Paper sx={{ p: 3, bgcolor: 'grey.50', mt: 2 }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {renderTemplatePreview(settings.templates[previewTemplate])}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewTemplate(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}