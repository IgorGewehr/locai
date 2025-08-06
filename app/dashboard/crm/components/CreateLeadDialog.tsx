'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  WhatsApp,
  AttachMoney,
  LocationOn,
  Home,
  LocalOffer,
} from '@mui/icons-material';
import { LeadSource, LeadStatus } from '@/lib/types/crm';
import { useTenantServices } from '@/lib/hooks/useTenantServices';
import { useAuth } from '@/lib/hooks/useAuth';

interface CreateLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const steps = ['Informações Básicas', 'Preferências', 'Qualificação'];

export default function CreateLeadDialog({ open, onClose, onSuccess }: CreateLeadDialogProps) {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    phone: '',
    email: '',
    whatsappNumber: '',
    source: LeadSource.MANUAL,
    sourceDetails: '',
    
    // Preferences
    propertyType: [] as string[],
    location: [] as string[],
    priceMin: '',
    priceMax: '',
    bedrooms: '',
    moveInDate: '',
    
    // Qualification
    budget: false,
    authority: false,
    need: false,
    timeline: false,
    notes: '',
    tags: [] as string[],
  });

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      await crmService.createLead({
        tenantId: user?.tenantId || '',
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        whatsappNumber: formData.whatsappNumber || formData.phone,
        status: LeadStatus.NEW,
        source: formData.source,
        sourceDetails: formData.sourceDetails || undefined,
        score: 50, // Initial score
        temperature: 'warm',
        qualificationCriteria: {
          budget: formData.budget,
          authority: formData.authority,
          need: formData.need,
          timeline: formData.timeline,
        },
        preferences: {
          propertyType: formData.propertyType.length > 0 ? formData.propertyType : undefined,
          location: formData.location.length > 0 ? formData.location : undefined,
          priceRange: formData.priceMin && formData.priceMax
            ? { min: parseFloat(formData.priceMin), max: parseFloat(formData.priceMax) }
            : undefined,
          bedrooms: formData.bedrooms
            ? { min: parseInt(formData.bedrooms), max: parseInt(formData.bedrooms) + 2 }
            : undefined,
          moveInDate: formData.moveInDate ? new Date(formData.moveInDate) : undefined,
        } as any,
        tags: formData.tags,
        firstContactDate: new Date(),
        lastContactDate: new Date(),
        totalInteractions: 0,
        assignedTo: user?.id,
      } as any);
      
      onSuccess();
      handleReset();
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      whatsappNumber: '',
      source: LeadSource.MANUAL,
      sourceDetails: '',
      propertyType: [],
      location: [],
      priceMin: '',
      priceMax: '',
      bedrooms: '',
      moveInDate: '',
      budget: false,
      authority: false,
      need: false,
      timeline: false,
      notes: '',
      tags: [],
    });
    setActiveStep(0);
  };

  const propertyTypes = ['Casa', 'Apartamento', 'Flat', 'Kitnet', 'Cobertura', 'Loft'];
  const locations = ['Centro', 'Zona Sul', 'Zona Norte', 'Zona Oeste', 'Zona Leste'];

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="(11) 99999-9999"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="WhatsApp"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="Mesmo do telefone"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <WhatsApp />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Origem do Lead</InputLabel>
                <Select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadSource })}
                  label="Origem do Lead"
                >
                  <MenuItem value={LeadSource.MANUAL}>Manual</MenuItem>
                  <MenuItem value={LeadSource.WHATSAPP_AI}>WhatsApp IA</MenuItem>
                  <MenuItem value={LeadSource.WEBSITE}>Site</MenuItem>
                  <MenuItem value={LeadSource.REFERRAL}>Indicação</MenuItem>
                  <MenuItem value={LeadSource.SOCIAL_MEDIA}>Redes Sociais</MenuItem>
                  <MenuItem value={LeadSource.GOOGLE_ADS}>Google Ads</MenuItem>
                  <MenuItem value={LeadSource.OTHER}>Outro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Detalhes da Origem"
                value={formData.sourceDetails}
                onChange={(e) => setFormData({ ...formData, sourceDetails: e.target.value })}
                placeholder="Ex: Nome do indicador"
              />
            </Grid>
          </Grid>
        );
      
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Imóvel</InputLabel>
                <Select
                  multiple
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as string[] })}
                  label="Tipo de Imóvel"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {propertyTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Localização Preferida</InputLabel>
                <Select
                  multiple
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value as string[] })}
                  label="Localização Preferida"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {locations.map((loc) => (
                    <MenuItem key={loc} value={loc}>
                      {loc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valor Mínimo"
                type="number"
                value={formData.priceMin}
                onChange={(e) => setFormData({ ...formData, priceMin: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valor Máximo"
                type="number"
                value={formData.priceMax}
                onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quartos"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Home />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data de Mudança"
                type="date"
                value={formData.moveInDate}
                onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        );
      
      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Método BANT para qualificação de leads
              </Alert>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.checked })}
                  />
                }
                label="Budget - Tem orçamento definido para locação"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.authority}
                    onChange={(e) => setFormData({ ...formData, authority: e.target.checked })}
                  />
                }
                label="Authority - É o decisor ou influenciador da decisão"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.need}
                    onChange={(e) => setFormData({ ...formData, need: e.target.checked })}
                  />
                }
                label="Need - Tem necessidade real de locação"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.timeline}
                    onChange={(e) => setFormData({ ...formData, timeline: e.target.checked })}
                  />
                }
                label="Timeline - Tem prazo definido para mudança"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Adicione detalhes importantes sobre este lead..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags"
                placeholder="Digite e pressione Enter"
                helperText="Separe as tags por vírgula"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalOffer />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Novo Lead</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {getStepContent(activeStep)}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Voltar</Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 0 && (!formData.name || !formData.phone)}
          >
            Próximo
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
          >
            Criar Lead
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}