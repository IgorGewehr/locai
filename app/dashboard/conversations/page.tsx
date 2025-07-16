'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
  Button,
} from '@mui/material';
import {
  Search,
  MoreVert,
  WhatsApp,
  Reply,
  Archive,
  Star,
  StarBorder,
  Circle,
  CheckCircle,
  Schedule,
  Person,
  Chat,
  TrendingUp,
  AccessTime,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Conversation {
  id: string;
  clientName: string;
  clientPhone: string;
  lastMessage: string;
  lastMessageTime: Date;
  status: 'active' | 'pending' | 'resolved' | 'archived';
  priority: 'high' | 'medium' | 'low';
  unreadCount: number;
  isStarred: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  aiConfidence: number;
  tags: string[];
  assignedAgent?: string;
}


export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const router = useRouter();

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, conversation: Conversation) => {
    setMenuAnchor(event.currentTarget);
    setSelectedConversation(conversation);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedConversation(null);
  };

  const handleViewConversation = () => {
    if (selectedConversation) {
      router.push(`/dashboard/conversations/${selectedConversation.id}`);
    }
    handleMenuClose();
  };

  const handleToggleStar = (conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, isStarred: !conv.isStarred }
          : conv
      )
    );
  };

  const handleMarkAsRead = (conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  const handleArchive = () => {
    if (selectedConversation) {
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, status: 'archived' }
            : conv
        )
      );
    }
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'resolved': return 'primary';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'pending': return 'Pendente';
      case 'resolved': return 'Resolvida';
      case 'archived': return 'Arquivada';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'neutral': return 'default';
      case 'negative': return 'error';
      default: return 'default';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'neutral': return '😐';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  const totalConversations = conversations.length;
  const pendingConversations = conversations.filter(c => c.status === 'pending').length;
  const activeConversations = conversations.filter(c => c.status === 'active').length;
  const avgResponseTime = conversations.length > 0 ? '1.2s' : '0s';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Conversas WhatsApp
        </Typography>
        <Button
          variant="contained"
          startIcon={<WhatsApp />}
          onClick={() => window.open('https://wa.me/', '_blank')}
        >
          Abrir WhatsApp
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total de Conversas
                  </Typography>
                  <Typography variant="h4" component="div">
                    {totalConversations}
                  </Typography>
                </Box>
                <Chat color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Pendentes
                  </Typography>
                  <Typography variant="h4" component="div">
                    {pendingConversations}
                  </Typography>
                </Box>
                <Schedule color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Ativas
                  </Typography>
                  <Typography variant="h4" component="div">
                    {activeConversations}
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Tempo Médio
                  </Typography>
                  <Typography variant="h4" component="div">
                    {avgResponseTime}
                  </Typography>
                </Box>
                <AccessTime color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Buscar conversas..."
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
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              SelectProps={{
                native: true,
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Ativas</option>
              <option value="pending">Pendentes</option>
              <option value="resolved">Resolvidas</option>
              <option value="archived">Arquivadas</option>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* Conversations List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lista de Conversas
          </Typography>
          <List>
            {filteredConversations.map((conversation, index) => (
              <Box key={conversation.id}>
                <ListItem
                  sx={{
                    borderRadius: 1,
                    backgroundColor: conversation.unreadCount > 0 ? 'action.hover' : 'inherit',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push(`/dashboard/conversations/${conversation.id}`)}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conversation.unreadCount}
                      color="error"
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <WhatsApp />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="subtitle1" 
                          fontWeight={conversation.unreadCount > 0 ? 'bold' : 'medium'}
                        >
                          {conversation.clientName}
                        </Typography>
                        <Chip
                          label={getStatusLabel(conversation.status)}
                          color={getStatusColor(conversation.status) as any}
                          size="small"
                        />
                        <Chip
                          label={conversation.priority}
                          color={getPriorityColor(conversation.priority) as any}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="body2">
                          {getSentimentIcon(conversation.sentiment)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <span style={{ marginTop: '4px', display: 'block' }}>
                        <span 
                          style={{ 
                            fontSize: '0.875rem',
                            color: 'rgba(0, 0, 0, 0.6)',
                            fontWeight: conversation.unreadCount > 0 ? '500' : 'normal'
                          }}
                        >
                          {conversation.lastMessage}
                        </span>
                        <br />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            {conversation.lastMessageTime.toLocaleString('pt-BR')}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            • Confiança IA: {isNaN(conversation.aiConfidence * 100) ? 0 : (conversation.aiConfidence * 100).toFixed(0)}%
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            • {conversation.assignedAgent}
                          </span>
                        </span>
                        <br />
                        <span style={{ display: 'flex', gap: '2px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {conversation.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                padding: '1px 4px',
                                border: '1px solid rgba(0, 0, 0, 0.23)',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                lineHeight: '16px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      </span>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(conversation.id);
                        }}
                      >
                        {conversation.isStarred ? <Star color="warning" /> : <StarBorder />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, conversation);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < filteredConversations.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewConversation}>
          <Reply sx={{ mr: 1 }} />
          Abrir Conversa
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedConversation) {
            handleMarkAsRead(selectedConversation.id);
          }
          handleMenuClose();
        }}>
          <CheckCircle sx={{ mr: 1 }} />
          Marcar como Lida
        </MenuItem>
        <MenuItem onClick={handleArchive}>
          <Archive sx={{ mr: 1 }} />
          Arquivar
        </MenuItem>
      </Menu>
    </Box>
  );
}