'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Link as LinkIcon,
  Google as GoogleIcon,
  Email as EmailIcon,
  CheckCircle,
} from '@mui/icons-material';
import {
  EmailAuthProvider,
  linkWithCredential,
  GoogleAuthProvider,
  linkWithPopup,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';

export default function LinkAccountsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  // Verificar provedores vinculados ao carregar
  useState(() => {
    const checkProviders = async () => {
      if (user?.email) {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, user.email);
          setLinkedProviders(methods);
        } catch (error) {
          logger.error('Erro ao verificar provedores:', error);
        }
      }
    };
    checkProviders();
  });

  const handleLinkEmailPassword = async () => {
    if (!auth.currentUser || !email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Criar credential de email/senha
      const credential = EmailAuthProvider.credential(email, password);

      // Vincular à conta atual
      await linkWithCredential(auth.currentUser, credential);

      // Atualizar Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        authProviders: [...(linkedProviders || []), 'password']
      });

      logger.info('✅ Email/senha vinculado com sucesso', {
        uid: auth.currentUser.uid,
        email
      });

      setSuccess('Email e senha vinculados com sucesso! Agora você pode fazer login com ambos os métodos.');
      setLinkedProviders([...linkedProviders, 'password']);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error: any) {
      logger.error('Erro ao vincular email/senha:', error);

      let errorMessage = 'Erro ao vincular conta';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso por outra conta.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca (mínimo 6 caracteres).';
      } else if (error.code === 'auth/provider-already-linked') {
        errorMessage = 'Este provedor já está vinculado.';
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'Estas credenciais já estão em uso.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) {
      setError('Você precisa estar logado');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);

      // Atualizar Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        authProviders: [...(linkedProviders || []), 'google.com']
      });

      logger.info('✅ Google vinculado com sucesso', {
        uid: auth.currentUser.uid
      });

      setSuccess('Conta Google vinculada com sucesso! Agora você pode fazer login com ambos os métodos.');
      setLinkedProviders([...linkedProviders, 'google.com']);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error: any) {
      logger.error('Erro ao vincular Google:', error);

      let errorMessage = 'Erro ao vincular conta Google';

      if (error.code === 'auth/provider-already-linked') {
        errorMessage = 'Sua conta Google já está vinculada.';
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'Esta conta Google já está vinculada a outro usuário.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login cancelado.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="warning">
          Você precisa estar logado para vincular contas.
        </Alert>
        <Button
          fullWidth
          variant="contained"
          onClick={() => router.push('/login')}
          sx={{ mt: 2 }}
        >
          Ir para Login
        </Button>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          sx={{
            p: 4,
            backgroundColor: '#111111',
            borderRadius: 3,
            border: '1px solid #333333',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <LinkIcon sx={{ fontSize: 48, color: '#3b82f6', mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff', mb: 1 }}>
              Vincular Contas
            </Typography>
            <Typography variant="body2" sx={{ color: '#a1a1a1' }}>
              Adicione métodos de login à sua conta {user.email}
            </Typography>
          </Box>

          <Divider sx={{ my: 3, borderColor: '#333333' }} />

          {/* Status dos provedores vinculados */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#a1a1a1', mb: 2 }}>
              Métodos de login ativos:
            </Typography>
            <Stack spacing={1}>
              {linkedProviders.includes('password') && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10b981' }}>
                  <CheckCircle sx={{ fontSize: 16 }} />
                  <EmailIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">Email e senha</Typography>
                </Box>
              )}
              {linkedProviders.includes('google.com') && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10b981' }}>
                  <CheckCircle sx={{ fontSize: 16 }} />
                  <GoogleIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">Google</Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Vincular Email/Senha */}
          {!linkedProviders.includes('password') && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Adicionar Email e Senha
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#1a1a1a',
                      '& fieldset': { borderColor: '#404040' },
                    },
                    '& .MuiInputLabel-root': { color: '#a1a1a1' },
                    '& .MuiOutlinedInput-input': { color: '#ffffff' },
                  }}
                />
                <TextField
                  fullWidth
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#1a1a1a',
                      '& fieldset': { borderColor: '#404040' },
                    },
                    '& .MuiInputLabel-root': { color: '#a1a1a1' },
                    '& .MuiOutlinedInput-input': { color: '#ffffff' },
                  }}
                />
                <Button
                  fullWidth
                  size="large"
                  disabled={isLoading || !email || !password}
                  onClick={handleLinkEmailPassword}
                  startIcon={isLoading ? <CircularProgress size={16} /> : <EmailIcon />}
                  sx={{
                    py: 1.8,
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    '&:hover': { backgroundColor: '#2563eb' },
                  }}
                >
                  {isLoading ? 'Vinculando...' : 'Vincular Email/Senha'}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Vincular Google */}
          {!linkedProviders.includes('google.com') && (
            <Box>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Adicionar Google
              </Typography>
              <Button
                fullWidth
                size="large"
                disabled={isLoading}
                onClick={handleLinkGoogle}
                startIcon={isLoading ? <CircularProgress size={16} /> : <GoogleIcon />}
                sx={{
                  py: 1.8,
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  '&:hover': { backgroundColor: '#f9fafb' },
                }}
              >
                {isLoading ? 'Vinculando...' : 'Vincular Google'}
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 3, borderColor: '#333333' }} />

          <Button
            fullWidth
            variant="outlined"
            onClick={() => router.push('/dashboard')}
            sx={{
              borderColor: '#404040',
              color: '#a1a1a1',
              '&:hover': {
                borderColor: '#525252',
                backgroundColor: '#1a1a1a',
              },
            }}
          >
            Voltar ao Dashboard
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
