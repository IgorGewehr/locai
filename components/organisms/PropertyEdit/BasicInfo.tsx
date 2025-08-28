'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  InputAdornment,
  Paper,
  Typography,
  Alert,
  Fade,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Home,
  LocationOn,
  Description,
  Category,
  InfoOutlined,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { PropertyCategory, PROPERTY_CATEGORIES_LABELS } from '@/lib/types/property';
import { logger } from '@/lib/utils/logger';

export const PropertyBasicInfo: React.FC = () => {
  const theme = useTheme();
  const { control, formState: { errors }, watch, trigger } = useFormContext();
  const [titleLength, setTitleLength] = useState(0);
  const [descLength, setDescLength] = useState(0);

  const title = watch('title');
  const description = watch('description');

  useEffect(() => {
    setTitleLength(title?.length || 0);
  }, [title]);

  useEffect(() => {
    setDescLength(description?.length || 0);
  }, [description]);

  // Real-time validation trigger
  const handleFieldBlur = async (fieldName: string) => {
    const isValid = await trigger(fieldName);
    logger.debug('Field validation', { field: fieldName, isValid });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Title Field */}
        <Grid item xs={12}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3,
              backgroundColor: errors.title 
                ? alpha(theme.palette.error.main, 0.05)
                : alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${
                errors.title 
                  ? alpha(theme.palette.error.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1)
              }`,
              borderRadius: 2,
              transition: 'all 0.3s ease',
            }}
          >
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Título do Anúncio"
                  placeholder="Ex: Apartamento moderno com vista para o mar"
                  error={!!errors.title}
                  helperText={
                    <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{errors.title?.message || 'Título atrativo que destaque o diferencial'}</span>
                      <span>{titleLength}/100</span>
                    </span>
                  }
                  onBlur={() => handleFieldBlur('title')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Home color={errors.title ? 'error' : 'primary'} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {field.value && !errors.title && (
                          <CheckCircle color="success" fontSize="small" />
                        )}
                        {errors.title && (
                          <Error color="error" fontSize="small" />
                        )}
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    maxLength: 100,
                  }}
                />
              )}
            />
          </Paper>
        </Grid>

        {/* Description Field */}
        <Grid item xs={12}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3,
              backgroundColor: errors.description 
                ? alpha(theme.palette.error.main, 0.05)
                : alpha(theme.palette.secondary.main, 0.05),
              border: `1px solid ${
                errors.description 
                  ? alpha(theme.palette.error.main, 0.2)
                  : alpha(theme.palette.secondary.main, 0.1)
              }`,
              borderRadius: 2,
              transition: 'all 0.3s ease',
            }}
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={6}
                  label="Descrição Detalhada"
                  placeholder="Descreva as características únicas, comodidades, localização e experiências que o hóspede terá..."
                  error={!!errors.description}
                  helperText={
                    <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{errors.description?.message || 'Seja detalhado e persuasivo'}</span>
                      <span>{descLength}/2000</span>
                    </span>
                  }
                  onBlur={() => handleFieldBlur('description')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                        <Description color={errors.description ? 'error' : 'secondary'} />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    maxLength: 2000,
                  }}
                />
              )}
            />
          </Paper>
        </Grid>

        {/* Address and Category */}
        <Grid item xs={12} md={8}>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Endereço Completo"
                placeholder="Rua, número, bairro, cidade - Estado"
                error={!!errors.address}
                helperText={errors.address?.message || 'Endereço completo para localização'}
                onBlur={() => handleFieldBlur('address')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn color={errors.address ? 'error' : 'action'} />
                    </InputAdornment>
                  ),
                  endAdornment: field.value && !errors.address && (
                    <CheckCircle color="success" fontSize="small" />
                  ),
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Tipo de Imóvel"
                error={!!errors.category}
                helperText={errors.category?.message || 'Categoria do imóvel'}
                onBlur={() => handleFieldBlur('category')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Category color={errors.category ? 'error' : 'action'} />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">
                  <em>Selecione uma categoria</em>
                </MenuItem>
                {Object.entries(PROPERTY_CATEGORIES_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        {/* Location Details */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Cidade"
                    placeholder="Ex: Rio de Janeiro"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="neighborhood"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Bairro"
                    placeholder="Ex: Copacabana"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Tips Section */}
        <Grid item xs={12}>
          <Fade in timeout={500}>
            <Alert 
              severity="info" 
              icon={<InfoOutlined />}
              sx={{ 
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  color: theme.palette.info.main,
                }
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Dicas para um anúncio de sucesso:
              </Typography>
              <Box component="ul" sx={{ pl: 2, my: 1 }}>
                <Typography component="li" variant="body2">
                  Use palavras-chave que os hóspedes buscam: "piscina", "próximo ao metrô", "vista para o mar"
                </Typography>
                <Typography component="li" variant="body2">
                  Seja específico sobre pontos de interesse próximos (praias, restaurantes, atrações)
                </Typography>
                <Typography component="li" variant="body2">
                  Destaque diferenciais únicos que tornam seu imóvel especial
                </Typography>
                <Typography component="li" variant="body2">
                  Mantenha um tom acolhedor e profissional na descrição
                </Typography>
              </Box>
            </Alert>
          </Fade>
        </Grid>
      </Grid>
    </Box>
  );
};