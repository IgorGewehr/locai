'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  Chip,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  VolumeUp,
  VolumeOff,
  Settings,
  PlayArrow,
  Stop,
  Mic,
  RecordVoiceOver,
  Speed,
  HighQuality,
  Save,
  RestoreFromTrash
} from '@mui/icons-material';
import { VOICE_OPTIONS, DEFAULT_AUDIO_PREFERENCES, AudioPreferences } from '@/lib/services/transcription-service';

interface AudioPreferencesProps {
  onSave?: (preferences: AudioPreferences) => void;
  initialPreferences?: AudioPreferences;
}

export default function AudioPreferencesComponent({ 
  onSave, 
  initialPreferences = DEFAULT_AUDIO_PREFERENCES 
}: AudioPreferencesProps) {
  const [preferences, setPreferences] = useState<AudioPreferences>(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const handlePreferenceChange = (key: keyof AudioPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onSave?.(preferences);
      console.log('Audio preferences saved:', preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setPreferences(DEFAULT_AUDIO_PREFERENCES);
  };

  const testVoice = async (voiceId: string) => {
    if (testingVoice) return;
    
    setTestingVoice(true);
    setCurrentlyPlaying(voiceId);
    
    try {
      // Simulate voice test - in real app would generate and play audio
      const testText = "Olá! Esta é uma demonstração da minha voz. Como posso ajudar você hoje?";
      console.log(`Testing voice: ${voiceId} with text: "${testText}"`);
      
      // Simulate audio playback time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } finally {
      setTestingVoice(false);
      setCurrentlyPlaying(null);
    }
  };

  const getVoiceTypeIcon = (voiceId: string) => {
    const femaleVoices = ['nova', 'shimmer'];
    const maleVoices = ['echo', 'fable', 'onyx'];
    
    if (femaleVoices.includes(voiceId)) {
      return '👩';
    } else if (maleVoices.includes(voiceId)) {
      return '👨';
    }
    return '🎤';
  };

  const getQualityDescription = (model: string) => {
    return model === 'tts-1-hd' ? 'Alta qualidade (mais lento)' : 'Qualidade padrão (mais rápido)';
  };

  const getSpeedDescription = (speed: number) => {
    if (speed <= 0.75) return 'Muito lento';
    if (speed <= 0.9) return 'Lento';
    if (speed <= 1.1) return 'Normal';
    if (speed <= 1.25) return 'Rápido';
    return 'Muito rápido';
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <RecordVoiceOver />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Configurações de Áudio
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Personalize como o AI responde com áudio no WhatsApp
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Enable Audio Responses */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <VolumeUp color="primary" />
                      <Box>
                        <Typography variant="h6">
                          Respostas em Áudio
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Permitir que o AI responda com áudio quando o cliente envia mensagens de voz
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={preferences.preferAudioResponses}
                      onChange={(e) => handlePreferenceChange('preferAudioResponses', e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Voice Selection */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Mic color="primary" />
                    <Typography variant="h6">
                      Seleção de Voz
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    {Object.entries(VOICE_OPTIONS).map(([voiceId, voiceInfo]) => (
                      <Grid item xs={12} sm={6} md={4} key={voiceId}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            cursor: 'pointer',
                            border: preferences.voice === voiceId ? '2px solid' : '1px solid',
                            borderColor: preferences.voice === voiceId ? 'primary.main' : 'divider',
                            '&:hover': {
                              borderColor: 'primary.main'
                            }
                          }}
                          onClick={() => handlePreferenceChange('voice', voiceId)}
                        >
                          <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h4" sx={{ mb: 1 }}>
                              {getVoiceTypeIcon(voiceId)}
                            </Typography>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {voiceInfo.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {voiceInfo.description}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                              {preferences.voice === voiceId && (
                                <Chip label="Selecionada" color="primary" size="small" />
                              )}
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  testVoice(voiceId);
                                }}
                                disabled={testingVoice}
                              >
                                {currentlyPlaying === voiceId ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <PlayArrow />
                                )}
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {testingVoice && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        Testando voz... (em um app real, um áudio seria reproduzido)
                      </Box>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Voice Quality */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <HighQuality color="primary" />
                    <Typography variant="h6">
                      Qualidade de Voz
                    </Typography>
                  </Box>
                  
                  <FormControl fullWidth>
                    <InputLabel>Modelo</InputLabel>
                    <Select
                      value={preferences.voiceModel}
                      label="Modelo"
                      onChange={(e) => handlePreferenceChange('voiceModel', e.target.value)}
                    >
                      <MenuItem value="tts-1">
                        <Box>
                          <Typography variant="body2">TTS-1 (Padrão)</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Mais rápido, menor custo
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="tts-1-hd">
                        <Box>
                          <Typography variant="body2">TTS-1 HD (Alta Qualidade)</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Melhor qualidade, mais lento
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {getQualityDescription(preferences.voiceModel)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Voice Speed */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Speed color="primary" />
                    <Typography variant="h6">
                      Velocidade da Voz
                    </Typography>
                  </Box>
                  
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={preferences.voiceSpeed}
                      onChange={(_, value) => handlePreferenceChange('voiceSpeed', value)}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      marks={[
                        { value: 0.5, label: '0.5x' },
                        { value: 1.0, label: '1.0x' },
                        { value: 1.5, label: '1.5x' },
                        { value: 2.0, label: '2.0x' }
                      ]}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value}x`}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {getSpeedDescription(preferences.voiceSpeed)}
                    </Typography>
                    <Chip 
                      label={`${preferences.voiceSpeed}x`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Current Settings Summary */}
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Resumo das Configurações
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Áudio Habilitado
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {preferences.preferAudioResponses ? 'Sim' : 'Não'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Voz Selecionada
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {VOICE_OPTIONS[preferences.voice].name}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Qualidade
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {preferences.voiceModel === 'tts-1-hd' ? 'HD' : 'Padrão'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Velocidade
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {preferences.voiceSpeed}x
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RestoreFromTrash />}
              onClick={handleResetToDefaults}
            >
              Restaurar Padrões
            </Button>
            
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSavePreferences}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}