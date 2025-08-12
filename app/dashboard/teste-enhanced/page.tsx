'use client';

import { useState } from 'react';
import { Box, Button, TextField, Card, CardContent, Typography, Alert, Chip, Paper, Stack } from '@mui/material';

export default function TesteEnhanced() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const testarEnhanced = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Teste direto do Enhanced Intent
      const response = await fetch('/api/enhanced-intent/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exemplos = [
    'olá, eu e minha esposa queremos alugar um apto',
    'quanto custa para 4 pessoas?',
    'quero cancelar minha reserva',
    'tem foto?',
    'quais são as regras?',
    'tá disponível dia 15?',
    'preciso mudar a data',
    'quero reservar',
    'me manda um orçamento',
    'quero visitar amanhã'
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🧪 Teste Direto - Enhanced Intent Detection
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Digite uma mensagem"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && testarEnhanced()}
              multiline
              rows={2}
            />

            <Button 
              variant="contained" 
              onClick={testarEnhanced}
              disabled={loading || !message.trim()}
            >
              {loading ? 'Testando...' : 'Testar Enhanced Intent'}
            </Button>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Exemplos rápidos:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {exemplos.map((ex, i) => (
                  <Chip
                    key={i}
                    label={ex}
                    onClick={() => setMessage(ex)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resultado da Detecção
            </Typography>

            <Stack spacing={2}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2" color="text.secondary">
                  Função Detectada:
                </Typography>
                <Typography variant="h6" color="primary">
                  {result.function || 'Nenhuma função detectada'}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2" color="text.secondary">
                  Confiança:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">
                    {(result.confidence * 100).toFixed(1)}%
                  </Typography>
                  <Chip 
                    label={result.confidence >= 0.8 ? 'Alta' : result.confidence >= 0.6 ? 'Média' : 'Baixa'}
                    color={result.confidence >= 0.8 ? 'success' : result.confidence >= 0.6 ? 'warning' : 'error'}
                    size="small"
                  />
                </Box>
              </Paper>

              {result.reasoning && (
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary">
                    Raciocínio:
                  </Typography>
                  <Typography>{result.reasoning}</Typography>
                </Paper>
              )}

              {result.parameters && Object.keys(result.parameters).length > 0 && (
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary">
                    Parâmetros Detectados:
                  </Typography>
                  <pre style={{ margin: 0, fontSize: '12px' }}>
                    {JSON.stringify(result.parameters, null, 2)}
                  </pre>
                </Paper>
              )}

              {result.processingTime && (
                <Typography variant="caption" color="text.secondary">
                  Tempo de processamento: {result.processingTime}ms
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Funções Disponíveis
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[
              'search_properties',
              'calculate_price',
              'get_property_details',
              'send_property_media',
              'create_reservation',
              'cancel_reservation',
              'modify_reservation',
              'register_client',
              'check_availability',
              'schedule_visit',
              'check_visit_availability',
              'get_policies',
              'generate_quote',
              'create_transaction'
            ].map((func) => (
              <Chip key={func} label={func} size="small" />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}