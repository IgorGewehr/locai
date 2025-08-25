'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ApiClient } from '@/lib/utils/api-client';
import { UserProfile as ExtendedUserProfile } from '@/lib/types/user';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  TextField,
  Button,
  Chip,
  Alert,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Email,
  Phone,
  Business,
  LocationOn,
  Security,
  Notifications,
  Language,
  DarkMode,
  History,
  Person,
  Badge,
  Settings,
} from '@mui/icons-material';

interface ProfileFormData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user';
  avatar: string | null;
  company: string;
  position: string;
  location: string;
  bio: string;
  joinDate: Date;
  lastLogin: Date;
  settings: {
    notifications: boolean;
    darkMode: boolean;
    language: 'pt-BR' | 'en-US';
    emailNotifications: boolean;
    whatsappNotifications: boolean;
  };
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileFormData | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/auth/profile');
        if (response.ok) {
          const profileData = await response.json();
          setProfile({
            id: profileData.id,
            name: profileData.name || user.name || user.email?.split('@')[0] || '',
            email: profileData.email || user.email || '',
            phone: profileData.phone || '',
            role: profileData.role || user.role,
            avatar: profileData.avatar || null,
            company: profileData.company || 'LocAI Imobiliária',
            position: profileData.position || (user.role === 'admin' ? 'Administrador' : 'Usuário'),
            location: profileData.location || '',
            bio: profileData.bio || '',
            joinDate: profileData.createdAt ? new Date(profileData.createdAt) : new Date(),
            lastLogin: profileData.lastLogin ? new Date(profileData.lastLogin) : new Date(),
            settings: {
              notifications: profileData.settings?.notifications ?? true,
              darkMode: profileData.settings?.darkMode ?? false,
              language: profileData.settings?.language ?? 'pt-BR',
              emailNotifications: profileData.settings?.emailNotifications ?? true,
              whatsappNotifications: profileData.settings?.whatsappNotifications ?? true,
            },
          });
        } else {
          // Fallback to user data if API fails
          const extendedUser = user as ExtendedUserProfile;
          setProfile({
            id: user.id,
            name: user.name || user.email?.split('@')[0] || '',
            email: user.email || '',
            phone: extendedUser.phone || extendedUser.phoneNumber || '',
            role: user.role,
            avatar: extendedUser.avatar || extendedUser.photoURL || null,
            company: 'LocAI Imobiliária',
            position: user.role === 'admin' ? 'Administrador' : 'Usuário',
            location: '',
            bio: '',
            joinDate: new Date(),
            lastLogin: new Date(),
            settings: {
              notifications: true,
              darkMode: false,
              language: 'pt-BR',
              emailNotifications: true,
              whatsappNotifications: true,
            },
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    if (user && !profile) {
      loadProfile();
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!profile) return;
    
    try {
      // Save profile to backend
      const profileResponse = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      if (profileResponse.ok) {
        // Also update company settings if company info changed
        if (profile.company || profile.phone) {
          try {
            await ApiClient.put('/api/settings', {
              section: 'company',
              data: {
                name: profile.company,
                phone: profile.phone,
                email: profile.email,
              }
            });
          } catch (settingsError) {
            console.log('Settings sync failed, but profile saved:', settingsError);
          }
        }
        
        setEditing(false);
        setSuccessMessage('Perfil atualizado com sucesso!');
        setErrorMessage('');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage('Erro ao salvar perfil');
        setSuccessMessage('');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrorMessage('Erro ao salvar perfil');
      setSuccessMessage('');
    }
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const { url } = await response.json();
          setProfile(prev => prev ? { ...prev, avatar: url } : null);
          setSuccessMessage('Avatar atualizado com sucesso!');
          setErrorMessage('');
          setTimeout(() => setSuccessMessage(''), 5000);
        } else {
          const error = await response.json();
          setErrorMessage(error.error || 'Erro ao enviar avatar');
          setSuccessMessage('');
        }
      } catch (error) {
        console.error('Avatar upload error:', error);
        setErrorMessage('Erro ao enviar avatar');
        setSuccessMessage('');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSettingChange = useCallback((setting: keyof ProfileFormData['settings'], value: boolean) => {
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          [setting]: value,
        },
      };
    });
  }, []);

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'primary' : 'secondary';
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Usuário';
  };

  // Memoized handlers to prevent infinite loops
  const handleFieldChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  }, []);

  // Memoized field values to prevent unnecessary re-renders
  const fieldValues = useMemo(() => {
    if (!profile) return {};
    return {
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      company: profile.company || '',
      position: profile.position || '',
      location: profile.location || '',
      bio: profile.bio || '',
    };
  }, [profile]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography>Erro ao carregar perfil</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }} 
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setErrorMessage('')}
        >
          {errorMessage}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Meu Perfil
        </Typography>
        <Button
          variant={editing ? 'outlined' : 'contained'}
          startIcon={editing ? <Cancel /> : <Edit />}
          onClick={() => setEditing(!editing)}
        >
          {editing ? 'Cancelar' : 'Editar Perfil'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Avatar
                  {...(profile.avatar && { src: profile.avatar })}
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 2,
                    fontSize: '2rem',
                    bgcolor: 'primary.main',
                  }}
                >
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
                {editing && (
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 'calc(50% - 70px)',
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                    component="label"
                    disabled={uploading}
                  >
                    <PhotoCamera />
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleAvatarUpload}
                    />
                  </IconButton>
                )}
              </Box>

              <Typography variant="h5" gutterBottom>
                {profile.name}
              </Typography>
              
              <Chip
                label={getRoleLabel(profile.role)}
                color={getRoleColor(profile.role) as any}
                icon={<Badge />}
                sx={{ mb: 2 }}
              />

              <Typography variant="body1" color="text.secondary" gutterBottom>
                {profile.position}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                {profile.company}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText 
                    primary={profile.email}
                    secondary="Email"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Phone />
                  </ListItemIcon>
                  <ListItemText 
                    primary={profile.phone}
                    secondary="Telefone"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <LocationOn />
                  </ListItemIcon>
                  <ListItemText 
                    primary={profile.location}
                    secondary="Localização"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações Pessoais
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome Completo"
                    value={fieldValues.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={fieldValues.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={fieldValues.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Empresa"
                    value={fieldValues.company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cargo"
                    value={fieldValues.position}
                    onChange={(e) => handleFieldChange('position', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Localização"
                    value={fieldValues.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Biografia"
                    multiline
                    rows={3}
                    value={fieldValues.bio}
                    onChange={(e) => handleFieldChange('bio', e.target.value)}
                    disabled={!editing}
                    placeholder="Conte um pouco sobre você..."
                  />
                </Grid>
              </Grid>

              {editing && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    sx={{ mr: 2 }}
                  >
                    Salvar Alterações
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => setEditing(false)}
                  >
                    Cancelar
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configurações da Conta
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profile.settings.notifications}
                        onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                      />
                    }
                    label="Notificações do Sistema"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profile.settings.emailNotifications}
                        onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      />
                    }
                    label="Notificações por Email"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profile.settings.whatsappNotifications}
                        onChange={(e) => handleSettingChange('whatsappNotifications', e.target.checked)}
                      />
                    }
                    label="Notificações WhatsApp"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profile.settings.darkMode}
                        onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                      />
                    }
                    label="Tema Escuro"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações da Conta
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Person color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">
                        Membro desde
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {profile.joinDate.toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <History color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">
                        Último acesso
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {profile.lastLogin.toLocaleString('pt-BR')}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}