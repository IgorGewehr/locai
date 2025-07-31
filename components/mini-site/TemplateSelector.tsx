'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  IconButton,
  Paper,
  Avatar,
  Stack,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Palette,
  Visibility,
  CheckCircle,
  Close,
  Star,
  Speed,
  Smartphone,
  Desktop,
  Tablet,
  Brush,
  AutoAwesome,
} from '@mui/icons-material';
import { MINI_SITE_TEMPLATES, TEMPLATE_CATEGORIES, MiniSiteTemplate } from '@/lib/types/mini-site-themes';

interface TemplateSelectorProps {
  currentTemplate?: string;
  onTemplateSelect: (template: MiniSiteTemplate) => void;
  onClose: () => void;
  open: boolean;
}

export default function TemplateSelector({
  currentTemplate,
  onTemplateSelect,
  onClose,
  open,
}: TemplateSelectorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState<MiniSiteTemplate | null>(null);

  const filteredTemplates = selectedCategory === 'all' 
    ? MINI_SITE_TEMPLATES 
    : MINI_SITE_TEMPLATES.filter(template => template.category === selectedCategory);

  const handleTemplateSelect = (template: MiniSiteTemplate) => {
    onTemplateSelect(template);
    onClose();
  };

  const handlePreview = (template: MiniSiteTemplate) => {
    setPreviewTemplate(template);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      luxury: '#D4AF37',
      modern: '#2563EB',
      classic: '#1E3A8A',
      minimalist: '#6B7280',
      tropical: '#059669',
      urban: '#F59E0B',
    };
    return colors[category as keyof typeof colors] || '#6B7280';
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: isMobile ? 0 : 3,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Brush />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Escolha um Template
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione um design profissional para seu mini-site
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Tabs
              value={selectedCategory}
              onChange={(_, newValue) => setSelectedCategory(newValue)}
              variant={isMobile ? 'scrollable' : 'standard'}
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontWeight: 500,
                },
              }}
            >
              <Tab label="Todos" value="all" />
              {TEMPLATE_CATEGORIES.map(category => (
                <Tab
                  key={category.id}
                  label={category.name}
                  value={category.id}
                  icon={
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: getCategoryColor(category.id),
                        ml: 1,
                      }}
                    />
                  }
                  iconPosition="end"
                />
              ))}
            </Tabs>
          </Box>

          <Grid container spacing={3}>
            {filteredTemplates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    border: currentTemplate === template.id ? 2 : 1,
                    borderColor: currentTemplate === template.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 200,
                        background: template.theme.gradients.hero,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {currentTemplate === template.id && (
                        <Badge
                          badgeContent={<CheckCircle />}
                          color="primary"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            '& .MuiBadge-badge': {
                              bgcolor: 'success.main',
                            },
                          }}
                        />
                      )}
                      
                      <Box sx={{ textAlign: 'center', color: '#ffffff' }}>
                        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                          {template.name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Preview Design
                        </Typography>
                      </Box>
                    </CardMedia>

                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      <Chip
                        label={TEMPLATE_CATEGORIES.find(c => c.id === template.category)?.name}
                        size="small"
                        sx={{
                          bgcolor: getCategoryColor(template.category),
                          color: '#ffffff',
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                  </Box>

                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description}
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Smartphone fontSize="small" color="action" />
                        <Typography variant="caption">Mobile</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Speed fontSize="small" color="action" />
                        <Typography variant="caption">Rápido</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AutoAwesome fontSize="small" color="action" />
                        <Typography variant="caption">Moderno</Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handlePreview(template)}
                        sx={{ flex: 1 }}
                      >
                        Preview
                      </Button>
                      <Button
                        variant={currentTemplate === template.id ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleTemplateSelect(template)}
                        sx={{ flex: 1 }}
                        disabled={currentTemplate === template.id}
                      >
                        {currentTemplate === template.id ? 'Selecionado' : 'Selecionar'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        {previewTemplate && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight={600}>
                  Preview: {previewTemplate.name}
                </Typography>
                <IconButton onClick={() => setPreviewTemplate(null)} size="small">
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Paper
                sx={{
                  height: 400,
                  background: previewTemplate.theme.gradients.hero,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ textAlign: 'center', color: '#ffffff' }}>
                  <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
                    {previewTemplate.name}
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Visualização do Template
                  </Typography>
                </Box>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Características
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Categoria:</Typography>
                      <Chip
                        label={TEMPLATE_CATEGORIES.find(c => c.id === previewTemplate.category)?.name}
                        size="small"
                        sx={{ bgcolor: getCategoryColor(previewTemplate.category), color: '#ffffff' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Estilo do Hero:</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {previewTemplate.components.hero.style}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Layout dos Cards:</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {previewTemplate.components.propertyCard.style}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Paleta de Cores
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {[
                      { name: 'Primária', color: previewTemplate.theme.primaryColor },
                      { name: 'Secundária', color: previewTemplate.theme.secondaryColor },
                      { name: 'Destaque', color: previewTemplate.theme.accentColor },
                    ].map((colorItem) => (
                      <Tooltip key={colorItem.name} title={colorItem.name}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: colorItem.color,
                            border: '1px solid',
                            borderColor: 'divider',
                            cursor: 'pointer',
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewTemplate(null)}>
                Fechar
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleTemplateSelect(previewTemplate);
                  setPreviewTemplate(null);
                }}
              >
                Usar este Template
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}