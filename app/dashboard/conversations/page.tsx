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
  CircularProgress,
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
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Carregar conversas do Firestore
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const conversationsRef = collection(db, 'conversations');
        const q = query(conversationsRef, orderBy('lastMessageAt', 'desc'), limit(500));
        const querySnapshot = await getDocs(q);
        
        const conversationsByPhone = new Map<string, Conversation>();
        
        const conversationsPromises = querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          let lastMessage = data.lastMessage || '';
          
          // Se não tiver lastMessage, buscar na coleção de mensagens
          if (!lastMessage) {
            try {
              const messagesRef = collection(db, 'messages');
              const messagesQuery = query(
                messagesRef,
                where('conversationId', '==', doc.id),
                orderBy('timestamp', 'desc'),
                limit(1)
              );
              const messagesSnapshot = await getDocs(messagesQuery);
              if (!messagesSnapshot.empty) {
                const lastMessageDoc = messagesSnapshot.docs[0];
                lastMessage = lastMessageDoc?.data()?.content || lastMessageDoc?.data()?.message || '';
              }
            } catch (err) {
              console.log('Erro ao buscar última mensagem para conversa', doc.id, err);
            }
          }
          
          // Mapear dados do Firestore para interface Conversation
          const conversation: Conversation = {
            id: doc.id,
            clientName: data.clientName || 'Cliente',
            clientPhone: data.clientPhone || '',
            lastMessage: lastMessage || 'Conversa iniciada',
            lastMessageTime: data.lastMessageAt?.toDate() || data.updatedAt?.toDate() || new Date(),
            status: data.status || 'active',
            priority: data.priority || 'medium',
            unreadCount: data.unreadCount || 0,
            isStarred: data.isStarred || false,
            sentiment: data.sentiment || 'neutral',
            aiConfidence: data.confidence || 0,
            tags: data.tags || [],
            assignedAgent: data.assignedAgent || 'AI Sofia',
          };
          
          return conversation;
        });
        
        const allConversations = await Promise.all(conversationsPromises);
        
        // Agrupar por número de telefone - manter apenas a conversa mais recente
        allConversations.forEach((conversation) => {
          const existingConversation = conversationsByPhone.get(conversation.clientPhone);
          if (!existingConversation || conversation.lastMessageTime > existingConversation.lastMessageTime) {
            conversationsByPhone.set(conversation.clientPhone, conversation);
          }
        });
        
        // Converter Map para Array e ordenar por última mensagem
        const uniqueConversations = Array.from(conversationsByPhone.values())
          .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
        
        setConversations(uniqueConversations);
        console.log('Conversas carregadas (agrupadas por contato):', uniqueConversations.length);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 4, md: 5 } }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', md: '2rem', lg: '2.25rem' } }}>
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
      <Grid container spacing={{ xs: 3, md: 4 }} sx={{ mb: { xs: 4, md: 5 } }}>
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
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredConversations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                {conversations.length === 0 ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa corresponde aos filtros'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {conversations.length === 0 ? 'Aguardando primeira interação via WhatsApp' : 'Tente ajustar os filtros de busca'}
              </Typography>
            </Box>
          ) : (
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="subtitle1" 
                            fontWeight={conversation.unreadCount > 0 ? 'bold' : 'medium'}
                            sx={{ 
                              color: conversation.unreadCount > 0 ? '#1976d2' : '#333',
                              fontSize: '1rem'
                            }}
                          >
                            {conversation.clientName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {getSentimentIcon(conversation.sentiment)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            label={getStatusLabel(conversation.status)}
                            color={getStatusColor(conversation.status) as any}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                          {conversation.priority === 'high' && (
                            <Chip
                              label="Alta"
                              color="error"
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <span style={{ marginTop: '4px', display: 'block' }}>
                        <span 
                          style={{ 
                            fontSize: '0.875rem',
                            color: '#555',
                            fontWeight: conversation.unreadCount > 0 ? '500' : 'normal',
                            lineHeight: '1.4'
                          }}
                        >
                          {conversation.lastMessage.length > 80 
                            ? conversation.lastMessage.substring(0, 80) + '...' 
                            : conversation.lastMessage}
                        </span>
                        <br />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#777', fontWeight: 500 }}>
                            {conversation.lastMessageTime.toLocaleString('pt-BR', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#777' }}>
                            • {conversation.clientPhone}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#777' }}>
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
          )}
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