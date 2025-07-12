'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
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

interface UserProfile {
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
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatar || null,
        company: user.company || 'LocAI Imobiliária',
        position: user.position || 'Usuário',
        location: user.location || '',
        bio: user.bio || '',
        joinDate: user.createdAt ? new Date(user.createdAt) : new Date(),
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : new Date(),
        settings: {
          notifications: user.settings?.notifications ?? true,
          darkMode: user.settings?.darkMode ?? false,
          language: user.settings?.language ?? 'pt-BR',
          emailNotifications: user.settings?.emailNotifications ?? true,
          whatsappNotifications: user.settings?.whatsappNotifications ?? true,
        },
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    
    try {
      // Save to backend
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        setEditing(false);
        alert('Perfil atualizado com sucesso!');
      } else {
        alert('Erro ao salvar perfil');
      }
    } catch (error) {
      alert('Erro ao salvar perfil');
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploading(true);
      // Simulate upload
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatar: reader.result as string }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSettingChange = (setting: keyof UserProfile['settings'], value: boolean) => {
    if (!profile) return;
    setProfile(prev => prev ? ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value,
      },
    }) : null);
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'primary' : 'secondary';
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Usuário';
  };

  if (loading || !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box>
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
                  src={profile.avatar || undefined}
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
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Empresa"
                    value={profile.company}
                    onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cargo"
                    value={profile.position}
                    onChange={(e) => setProfile(prev => ({ ...prev, position: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Localização"
                    value={profile.location}
                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Biografia"
                    multiline
                    rows={3}
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
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