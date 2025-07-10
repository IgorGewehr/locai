'use client';

import { useState, useEffect } from 'react';
import { clientService } from '@/lib/firebase/firestore';
import type { Client } from '@/lib/types/client';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Phone,
  Email,
  WhatsApp,
  Star,
  TrendingUp,
  AccessTime,
  Person,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';


export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const router = useRouter();

  // Load clients from Firebase
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientsData = await clientService.getAll();
        setClients(clientsData);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    client.phone.includes(searchTerm)
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    setMenuAnchor(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedClient(null);
  };

  const handleViewDetails = () => {
    if (selectedClient) {
      router.push(`/dashboard/clients/${selectedClient.id}`);
    }
    handleMenuClose();
  };

  const handleEditClient = () => {
    if (selectedClient) {
      router.push(`/dashboard/clients/${selectedClient.id}/edit`);
    }
    handleMenuClose();
  };

  const handleDeleteClient = async () => {
    if (selectedClient) {
      try {
        await clientService.delete(selectedClient.id);
        setClients(clients.filter(c => c.id !== selectedClient.id));
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
    handleMenuClose();
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  const getStatusLabel = (isActive: boolean) => {
    return isActive ? 'Ativo' : 'Inativo';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };


  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Clientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => router.push('/dashboard/clients/create')}
        >
          Novo Cliente
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total de Clientes
                  </Typography>
                  <Typography variant="h4" component="div">
                    {clients.length}
                  </Typography>
                </Box>
                <Person color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Clientes Ativos
                  </Typography>
                  <Typography variant="h4" component="div">
                    {clients.filter(c => c.isActive).length}
                  </Typography>
                </Box>
                <TrendingUp color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Gasto
                  </Typography>
                  <Typography variant="h4" component="div">
                    {formatCurrency(clients.reduce((sum, c) => sum + c.totalSpent, 0))}
                  </Typography>
                </Box>
                <Star color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Reservas Totais
                  </Typography>
                  <Typography variant="h4" component="div">
                    {clients.reduce((sum, c) => sum + c.totalReservations, 0)}
                  </Typography>
                </Box>
                <AccessTime color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Clients List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lista de Clientes
          </Typography>
          <List>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredClients.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography color="text.secondary">
                  Nenhum cliente encontrado
                </Typography>
              </Box>
            ) : (
              filteredClients.map((client, index) => (
              <Box key={client.id}>
                <ListItem
                  sx={{
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {client.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {client.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(client.isActive)}
                          color={getStatusColor(client.isActive) as any}
                          size="small"
                        />
                        <Chip
                          label={`Reservas: ${client.totalReservations}`}
                          color="primary"
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {client.email || 'Sem email'} • {client.phone}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Preferência: {client.preferences.preferredPaymentMethod} • {client.preferences.communicationPreference}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total gasto: {formatCurrency(client.totalSpent)}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" color="success">
                        <WhatsApp />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <Email />
                      </IconButton>
                      <IconButton size="small" color="secondary">
                        <Phone />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, client)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < filteredClients.length - 1 && <Divider />}
              </Box>
            )))}
          </List>
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <Person sx={{ mr: 1 }} />
          Ver Detalhes
        </MenuItem>
        <MenuItem onClick={handleEditClient}>
          <Edit sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={handleDeleteClient} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => router.push('/dashboard/clients/create')}
      >
        <Add />
      </Fab>
    </Box>
  );
}