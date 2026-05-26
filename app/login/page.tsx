'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
  Stack,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  PersonAdd,
  LockReset,
  CheckCircle,
  CardGiftcard,
  Google as GoogleIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { formatBrazilianPhone, normalizePhoneNumber, applyPhoneMask } from '@/lib/utils/phone-formatter';
import LoadingScreen from '@/components/atoms/LoadingScreen/LoadingScreen';

const loginSchema = yup.object().shape({
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  password: yup.string().min(6, 'Senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
});

const registerSchema = yup.object().shape({
  phone: yup
    .string()
    .required('Celular é obrigatório')
    .test('is-valid-phone', 'Celular inválido', (value) => {
      if (!value) return false;
      const cleaned = value.replace(/\D/g, '');
      return cleaned.length >= 10 && cleaned.length <= 13;
    }),
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  password: yup.string().min(6, 'Senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'As senhas devem ser iguais')
    .required('Confirmação de senha é obrigatória'),
});

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&.Mui-focused fieldset': { borderColor: '#dc2626', borderWidth: 2 },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', '&.Mui-focused': { color: '#f87171' } },
  '& .MuiOutlinedInput-input': { color: '#f1f5f9' },
};

const alertErrorSx = {
  borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
  color: '#f87171', '& .MuiAlert-icon': { color: '#f87171' }, py: 0.5,
};
const alertSuccessSx = {
  borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
  color: '#4ade80', '& .MuiAlert-icon': { color: '#4ade80' }, py: 0.5,
};

const primaryBtnSx = {
  py: 1.5, borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
  bgcolor: '#dc2626', color: '#fff', boxShadow: 'none',
  transition: 'all 0.2s ease',
  '&:hover': { bgcolor: '#b91c1c', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' },
  '&:disabled': { bgcolor: 'rgba(220,38,38,0.4)', color: 'rgba(255,255,255,0.7)' },
};
const googleBtnSx = {
  py: 1.5, borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
  bgcolor: 'transparent', color: '#e2e8f0', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.14)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.25)' },
  '&:disabled': { opacity: 0.5, color: 'rgba(255,255,255,0.4)' },
};

const FEATURES = [
  'Atendimento automático 24 horas no WhatsApp',
  'Triagem inteligente: veja quem precisa de você agora',
  'Assuma a conversa com um clique, quando quiser',
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = login, 1 = register
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, resetPassword, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const isAlreadyRedirecting = sessionStorage.getItem('redirecting');
      if (isAlreadyRedirecting) {
        sessionStorage.removeItem('redirecting');
        return;
      }
      sessionStorage.setItem('redirecting', 'true');
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    setLoginSuccess(false);
    setRegisterSuccess(false);
  }, [activeTab]);

  const loginForm = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema) as any,
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema) as any,
    defaultValues: { phone: '', email: '', password: '', confirmPassword: '' },
  });

  const resolveTarget = (): string => {
    let targetPath = '/dashboard';
    try {
      const savedPath = localStorage.getItem('redirectPath');
      if (savedPath && savedPath.startsWith('/dashboard')) {
        targetPath = savedPath;
        localStorage.removeItem('redirectPath');
      }
    } catch { /* ignore */ }
    return targetPath;
  };

  const handleLogin = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      await signIn(data.email, data.password);
      setLoginSuccess(true);
      setIsProcessing(true);
      setTimeout(() => {
        if (sessionStorage.getItem('redirecting')) return;
        sessionStorage.setItem('redirecting', 'true');
        router.replace(resolveTarget());
      }, 500);
    } catch (err: any) {
      let errorMessage = 'Email ou senha incorretos';
      if (err.code === 'auth/network-request-failed') errorMessage = 'Erro de conexão. Verifique sua internet.';
      else if (err.code === 'auth/user-disabled') errorMessage = 'Esta conta foi desativada.';
      else if (err.code === 'auth/user-not-found') errorMessage = 'Email não encontrado.';
      else if (err.code === 'auth/wrong-password') errorMessage = 'Senha incorreta.';
      else if (err.code === 'auth/invalid-credential') errorMessage = 'Email ou senha incorretos.';
      else if (err.code === 'auth/too-many-requests') errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      const normalizedPhone = normalizePhoneNumber(data.phone, true);
      await signUp(data.email, data.password, normalizedPhone, { free: 7 });
      setRegisterSuccess(true);
      setSuccess('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => {
        if (sessionStorage.getItem('redirecting')) return;
        sessionStorage.setItem('redirecting', 'true');
        router.replace(resolveTarget());
      }, 800);
    } catch (err: any) {
      let errorMessage = 'Erro ao criar conta';
      if (err.code === 'auth/network-request-failed') errorMessage = 'Erro de conexão. Verifique sua internet.';
      else if (err.code === 'auth/email-already-in-use') errorMessage = 'Este email já está em uso.';
      else if (err.code === 'auth/weak-password') errorMessage = 'A senha é muito fraca.';
      else if (err.code === 'auth/invalid-email') errorMessage = 'Email inválido.';
      else if (err.code === 'auth/operation-not-allowed') errorMessage = 'Criação de conta não permitida no momento.';
      else if (err.message) errorMessage = err.message;
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setError('Digite seu email');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await resetPassword(forgotEmail);
      setShowForgotPassword(false);
      setForgotEmail('');
      setError(null);
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
    } catch {
      setError('Erro ao enviar email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      await signInWithGoogle();
      if (activeTab === 0) setLoginSuccess(true);
      else setRegisterSuccess(true);
      setIsProcessing(true);
      setTimeout(() => {
        if (sessionStorage.getItem('redirecting')) return;
        sessionStorage.setItem('redirecting', 'true');
        router.replace(resolveTarget());
      }, 500);
    } catch (err: any) {
      let errorMessage = 'Erro ao fazer login com Google';
      if (err.code === 'auth/popup-closed-by-user') errorMessage = 'Login cancelado pelo usuário.';
      else if (err.code === 'auth/popup-blocked') errorMessage = 'Pop-up bloqueado. Permita pop-ups para este site.';
      else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Este email já está cadastrado com outro método de login. Faça login com email/senha primeiro e depois vincule sua conta Google em Configurações.');
        setIsLoading(false);
        return;
      } else if (err.code === 'auth/network-request-failed') errorMessage = 'Erro de conexão. Verifique sua internet.';
      else if (err.message) errorMessage = err.message;
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Redirecting / processing overlay — standardized red load screen
  if ((loginSuccess && isProcessing) || registerSuccess) {
    return <LoadingScreen />;
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', overflow: 'hidden', bgcolor: '#0b0f1a' }}>
      {/* ── LEFT: branding ─────────────────────────────── */}
      <Box
        sx={{
          flex: 1.1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between',
          p: 7, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(150deg, #450a0a 0%, #7f1d1d 45%, #b91c1c 100%)',
        }}
      >
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.6,
          background: 'radial-gradient(circle at 18% 18%, rgba(248,113,113,0.35), transparent 42%), radial-gradient(circle at 85% 82%, rgba(220,38,38,0.3), transparent 40%)',
        }} />

        {/* Brand */}
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box component="img" src="/logo.png" alt="AlugaZap" sx={{ width: 36, height: 36, borderRadius: '9px', objectFit: 'cover' }} />
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
            AlugaZap
          </Typography>
        </Box>

        {/* Headline + features */}
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
          <Typography sx={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.025em', mb: 2 }}>
            Sua imobiliária trabalhando enquanto você dorme.
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, mb: 4 }}>
            A Sofia atende seus clientes no WhatsApp, qualifica os leads e organiza tudo.
            Você entra só na hora de fechar.
          </Typography>
          <Stack spacing={1.75}>
            {FEATURES.map((f) => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircle sx={{ fontSize: 20, color: '#fca5a5', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.85)' }}>{f}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Typography sx={{ position: 'relative', zIndex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
          © 2024 Locai. Todos os direitos reservados.
        </Typography>
      </Box>

      {/* ── RIGHT: form ────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', px: { xs: 3, sm: 6 }, py: 4 }}>
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {/* Header */}
          <Box sx={{ mb: 3, display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <Box component="img" src="/logo.png" alt="AlugaZap" sx={{ width: 32, height: 32, borderRadius: '8px', objectFit: 'cover' }} />
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>AlugaZap</Typography>
          </Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', mb: 0.5 }}>
            {showForgotPassword ? 'Recuperar senha' : activeTab === 0 ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', mb: 3 }}>
            {showForgotPassword
              ? 'Enviaremos um link para redefinir sua senha.'
              : activeTab === 0 ? 'Entre para acessar seu painel.' : 'Comece com 7 dias grátis, sem cartão.'}
          </Typography>

          {!showForgotPassword && (
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                mb: 3, minHeight: 40,
                '& .MuiTabs-indicator': { backgroundColor: '#dc2626', height: 2 },
                '& .MuiTab-root': {
                  textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', minHeight: 40, p: 0, mr: 3,
                  color: 'rgba(255,255,255,0.5)', '&.Mui-selected': { color: '#f87171' },
                },
              }}
            >
              <Tab label="Entrar" />
              <Tab label="Criar conta" />
            </Tabs>
          )}

          {/* ── Forgot password ── */}
          {showForgotPassword ? (
            <Stack spacing={2.5}>
              <TextField fullWidth label="Email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} sx={fieldSx} />
              {error && <Alert severity="error" sx={alertErrorSx}>{error}</Alert>}
              <Stack direction="row" spacing={1.5}>
                <Button fullWidth variant="outlined" onClick={() => { setShowForgotPassword(false); setForgotEmail(''); setError(null); }}
                  sx={{ py: 1.5, borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.04)' } }}>
                  Voltar
                </Button>
                <Button fullWidth disabled={isLoading} onClick={handleForgotPassword}
                  endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <LockReset />} sx={primaryBtnSx}>
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </Button>
              </Stack>
            </Stack>
          ) : activeTab === 0 ? (
            /* ── Login ── */
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <Stack spacing={2.5}>
                <Controller name="email" control={loginForm.control} render={({ field }) => (
                  <TextField {...field} fullWidth label="Email" type="email" error={!!loginForm.formState.errors.email} helperText={loginForm.formState.errors.email?.message} sx={fieldSx} />
                )} />
                <Controller name="password" control={loginForm.control} render={({ field }) => (
                  <TextField {...field} fullWidth label="Senha" type={showPassword ? 'text' : 'password'}
                    error={!!loginForm.formState.errors.password} helperText={loginForm.formState.errors.password?.message}
                    InputProps={{ endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )}} sx={fieldSx} />
                )} />
                <Box sx={{ textAlign: 'right', mt: '-8px !important' }}>
                  <Link component="button" type="button" onClick={() => setShowForgotPassword(true)}
                    sx={{ color: '#f87171', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}>
                    Esqueceu a senha?
                  </Link>
                </Box>
                {error && <Alert severity="error" sx={alertErrorSx}>{error}</Alert>}
                {success && <Alert severity="success" sx={alertSuccessSx}>{success}</Alert>}
                <Button type="submit" fullWidth disabled={isLoading || isProcessing}
                  startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : isProcessing ? <CheckCircle sx={{ fontSize: 18 }} /> : <LoginIcon sx={{ fontSize: 18 }} />}
                  sx={{ ...primaryBtnSx, ...(isProcessing && { bgcolor: '#10b981', '&:hover': { bgcolor: '#10b981' } }) }}>
                  {isProcessing ? 'Logado' : isLoading ? 'Verificando...' : 'Entrar'}
                </Button>
                <Divider />
                <Button fullWidth disabled={isLoading || isProcessing} onClick={handleGoogleSignIn} startIcon={<GoogleIcon sx={{ fontSize: 18 }} />} sx={googleBtnSx}>
                  Continuar com Google
                </Button>
              </Stack>
            </form>
          ) : (
            /* ── Register ── */
            <form onSubmit={registerForm.handleSubmit(handleRegister)}>
              <Stack spacing={2.5}>
                <Box>
                  <Chip icon={<CardGiftcard sx={{ fontSize: '1rem' }} />} label="7 dias grátis"
                    sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#4ade80', fontWeight: 600, fontSize: '0.8125rem', '& .MuiChip-icon': { color: '#4ade80' } }} />
                </Box>
                <Controller name="phone" control={registerForm.control} render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextField fullWidth label="Celular" value={value}
                    onChange={(e) => onChange(applyPhoneMask(e.target.value))}
                    onBlur={(e) => { onChange(formatBrazilianPhone(e.target.value)); onBlur(); }}
                    inputRef={ref} error={!!registerForm.formState.errors.phone} helperText={registerForm.formState.errors.phone?.message}
                    placeholder="(00) 0 0000-0000"
                    InputProps={{ startAdornment: (<InputAdornment position="start"><PhoneIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} /></InputAdornment>) }}
                    sx={fieldSx} />
                )} />
                <Controller name="email" control={registerForm.control} render={({ field }) => (
                  <TextField {...field} fullWidth label="Email" type="email" error={!!registerForm.formState.errors.email} helperText={registerForm.formState.errors.email?.message} sx={fieldSx} />
                )} />
                <Controller name="password" control={registerForm.control} render={({ field }) => (
                  <TextField {...field} fullWidth label="Senha" type={showPassword ? 'text' : 'password'}
                    error={!!registerForm.formState.errors.password} helperText={registerForm.formState.errors.password?.message}
                    InputProps={{ endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )}} sx={fieldSx} />
                )} />
                <Controller name="confirmPassword" control={registerForm.control} render={({ field }) => (
                  <TextField {...field} fullWidth label="Confirmar senha" type={showConfirmPassword ? 'text' : 'password'}
                    error={!!registerForm.formState.errors.confirmPassword} helperText={registerForm.formState.errors.confirmPassword?.message}
                    InputProps={{ endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )}} sx={fieldSx} />
                )} />
                {error && <Alert severity="error" sx={alertErrorSx}>{error}</Alert>}
                {success && <Alert severity="success" sx={alertSuccessSx}>{success}</Alert>}
                <Button type="submit" fullWidth disabled={isLoading || registerSuccess}
                  startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <PersonAdd sx={{ fontSize: 18 }} />} sx={primaryBtnSx}>
                  {isLoading ? 'Criando conta...' : 'Criar conta'}
                </Button>
                <Divider />
                <Button fullWidth disabled={isLoading || registerSuccess} onClick={handleGoogleSignIn} startIcon={<GoogleIcon sx={{ fontSize: 18 }} />} sx={googleBtnSx}>
                  Continuar com Google
                </Button>
              </Stack>
            </form>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function Divider() {
  return (
    <Box sx={{ position: 'relative', textAlign: 'center', my: 0.5 }}>
      <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', bgcolor: 'rgba(255,255,255,0.1)' }} />
      <Typography component="span" sx={{ position: 'relative', bgcolor: '#0b0f1a', px: 1.5, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
        ou
      </Typography>
    </Box>
  );
}
