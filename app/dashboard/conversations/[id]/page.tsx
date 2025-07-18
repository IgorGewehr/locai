'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Button,
  TextField,
  IconButton,
  Alert,
  Paper,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Divider,
  Fade,
  styled,
  alpha,
  Card,
  CardContent,
  Badge,
} from '@mui/material';
import {
  ArrowBack,
  Send,
  WhatsApp,
  SmartToy,
  AttachFile,
  MoreVert,
  Check,
  DoneAll,
  Schedule,
  Star,
  StarBorder,
  Delete,
  Block,
  EmojiEmotions,
  Mic,
  Close,
  VolumeUp,
  Image as ImageIcon,
  InsertDriveFile,
  Person,
  Phone,
  Email,
  AccessTime,
  ChatBubbleOutline,
} from '@mui/icons-material';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Styled Components
const ConversationContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#111b21', // Dark background like WhatsApp
  overflow: 'hidden',
}));

const Header = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  backgroundColor: '#1e2a38', // Dark header background
  borderRadius: 0,
  borderBottom: '1px solid #3a4750',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  zIndex: 1000,
  position: 'sticky',
  top: 0,
  color: 'white',
}));

const MessagesArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  backgroundColor: '#0d1421', // Dark chat background like WhatsApp
  backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Cpath d="M0 0h20v20H0V0zm10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"/%3E%3C/g%3E%3C/svg%3E")',
  position: 'relative',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(255, 255, 255, 0.5)',
  },
}));

const MessageGroup = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isUser',
})<{ $isUser?: boolean }>(({ theme, $isUser }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: $isUser ? 'flex-end' : 'flex-start',
  gap: theme.spacing(0.5),
  maxWidth: '85%',
  alignSelf: $isUser ? 'flex-end' : 'flex-start',
  position: 'relative',
  zIndex: 1,
}));

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== '$isUser' && prop !== '$isAI',
})<{ $isUser?: boolean; $isAI?: boolean }>(({ theme, $isUser, $isAI }) => ({
  padding: theme.spacing(1.5, 2),
  maxWidth: '100%',
  borderRadius: $isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
  backgroundColor: $isUser 
    ? '#005c4b' // Dark green for user messages
    : $isAI 
      ? '#128c7e' // Light green for AI messages
      : '#005c4b', // Default to user style
  color: 'white', // White text for all messages
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  position: 'relative',
  wordBreak: 'break-word',
  fontSize: '0.95rem',
  lineHeight: 1.4,
  border: 'none',
  
  '&::before': $isUser ? {
    content: '""',
    position: 'absolute',
    bottom: 0,
    right: -8,
    width: 0,
    height: 0,
    border: '8px solid transparent',
    borderTopColor: '#005c4b',
    borderBottom: 'none',
    borderRight: 'none',
  } : $isAI ? {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: -8,
    width: 0,
    height: 0,
    border: '8px solid transparent',
    borderTopColor: '#128c7e',
    borderBottom: 'none',
    borderLeft: 'none',
  } : {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: -8,
    width: 0,
    height: 0,
    border: '8px solid transparent',
    borderTopColor: '#005c4b',
    borderBottom: 'none',
    borderLeft: 'none',
  },
}));

const MessageMeta = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isUser',
})<{ $isUser?: boolean }>(({ theme, $isUser }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.8)',
  marginTop: theme.spacing(0.5),
  justifyContent: $isUser ? 'flex-end' : 'flex-start',
}));

const InputArea = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#1e2a38', // Dark input area background
  borderRadius: 0,
  borderTop: '1px solid #3a4750',
  boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
}));

const DateDivider = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  margin: theme.spacing(3, 0),
  position: 'relative',
  zIndex: 1,
  '&::before, &::after': {
    content: '""',
    flex: 1,
    height: '1px',
    background: 'rgba(255, 255, 255, 0.3)',
  },
}));

const DateChip = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(18, 140, 126, 0.3)', // Semi-transparent green
  color: 'white',
  fontSize: '0.75rem',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(37, 211, 102, 0.3)',
}));

const StatusIcon = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$status',
})<{ $status?: string }>(({ theme, $status }) => ({
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.75rem',
  color: $status === 'read' ? theme.palette.info.main : 'rgba(255, 255, 255, 0.6)',
}));

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'ai' | 'agent';
  type: 'text' | 'image' | 'file' | 'audio';
  direction?: 'inbound' | 'outbound';
  isFromAI?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  metadata?: {
    delivered?: boolean;
    read?: boolean;
    clientName?: string;
    agentName?: string;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
  };
}

interface Conversation {
  id: string;
  clientName: string;
  clientPhone: string;
  lastMessage: string;
  timestamp: Date;
  status: 'active' | 'archived' | 'spam';
  isStarred: boolean;
  unreadCount: number;
  source: 'whatsapp' | 'web' | 'phone';
  metadata?: {
    clientAvatar?: string;
    tags?: string[];
    assignedAgent?: string;
  };
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (params.id) {
      loadConversation();
      loadMessages();
    }
  }, [params.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${params.id}`);
      if (!response.ok) throw new Error('Failed to load conversation');
      
      const data = await response.json();
      setConversation(data);
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError('Erro ao carregar conversa');
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const messagesResponse = await fetch(`/api/conversations/${params.id}/messages`);
      if (!messagesResponse.ok) return;
      
      const messagesData = await messagesResponse.json();
      
      // Transform messages
      const transformedMessages = messagesData.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        sender: msg.isFromAI ? 'ai' : (msg.direction === 'inbound' ? 'user' : 'agent'),
        type: msg.type || 'text',
        direction: msg.direction,
        isFromAI: msg.isFromAI,
        status: msg.status || 'delivered',
        metadata: {
          delivered: msg.status === 'delivered' || msg.status === 'read',
          read: msg.status === 'read',
          clientName: conversation?.clientName || 'Cliente',
          agentName: msg.isFromAI ? 'AI Sofia' : 'Você',
          mediaUrl: msg.mediaUrl,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
        }
      }));

      setMessages(transformedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageToSend = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Add optimistic message
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      content: messageToSend,
      timestamp: new Date(),
      sender: 'agent',
      type: 'text',
      direction: 'outbound',
      status: 'sent',
      metadata: {
        agentName: 'Você',
      }
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await fetch(`/api/conversations/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageToSend,
          type: 'text',
          direction: 'outbound',
          isFromAI: false,
        })
      });
      if (!response.ok) throw new Error('Failed to send message');
      
      // Reload messages to get the real message
      await loadMessages();
    } catch (err) {
      setError('Erro ao enviar mensagem');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp_')));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ptBR });
    } else if (isYesterday(date)) {
      return `Ontem ${format(date, 'HH:mm', { locale: ptBR })}`;
    } else {
      return format(date, 'dd/MM HH:mm', { locale: ptBR });
    }
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) {
      return 'Hoje';
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  };

  const shouldShowDateDivider = (message: Message, prevMessage: Message | null) => {
    if (!prevMessage) return true;
    const currentDate = new Date(message.timestamp);
    const prevDate = new Date(prevMessage.timestamp);
    return currentDate.toDateString() !== prevDate.toDateString();
  };

  const shouldGroupMessage = (message: Message, nextMessage: Message | null) => {
    if (!nextMessage) return false;
    const timeDiff = differenceInMinutes(new Date(nextMessage.timestamp), new Date(message.timestamp));
    return message.sender === nextMessage.sender && timeDiff < 5;
  };

  const getStatusIcon = (message: Message) => {
    if (message.sender !== 'agent') return null;
    
    if (message.metadata?.read) {
      return <DoneAll sx={{ fontSize: '0.75rem' }} />;
    } else if (message.metadata?.delivered) {
      return <Check sx={{ fontSize: '0.75rem' }} />;
    } else {
      return <Schedule sx={{ fontSize: '0.75rem' }} />;
    }
  };

  if (loading) {
    return (
      <ConversationContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      </ConversationContainer>
    );
  }

  return (
    <ConversationContainer>
      {/* Header */}
      <Header elevation={0}>
        <IconButton 
          onClick={() => router.back()} 
          sx={{ mr: 1, color: 'white' }}
        >
          <ArrowBack />
        </IconButton>
        
        <Avatar 
          sx={{ 
            width: 48, 
            height: 48,
            bgcolor: '#25d366', // WhatsApp green
            fontSize: '1.2rem',
            fontWeight: 600,
          }}
        >
          {conversation?.clientName ? conversation.clientName.charAt(0).toUpperCase() : 'C'}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>
            {conversation?.clientName || 'Cliente'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WhatsApp sx={{ fontSize: 16, color: '#25D366' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {conversation?.clientPhone || 'Número não disponível'}
            </Typography>
            {conversation?.status === 'active' && (
              <Chip 
                label="Ativo" 
                size="small" 
                color="success" 
                sx={{ fontSize: '0.7rem', height: 20 }} 
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Conversa favorita">
            <IconButton sx={{ color: 'white' }}>
              {conversation?.isStarred ? <Star color="warning" /> : <StarBorder />}
            </IconButton>
          </Tooltip>
          
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ color: 'white' }}>
            <MoreVert />
          </IconButton>
          
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem>
              <Phone sx={{ mr: 2 }} />
              Ligar para cliente
            </MenuItem>
            <MenuItem>
              <Email sx={{ mr: 2 }} />
              Enviar email
            </MenuItem>
            <Divider />
            <MenuItem>
              <Block sx={{ mr: 2 }} />
              Bloquear conversa
            </MenuItem>
            <MenuItem sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 2 }} />
              Deletar conversa
            </MenuItem>
          </Menu>
        </Box>
      </Header>

      {/* Messages Area */}
      <MessagesArea>
        {error && (
          <Alert severity="error" sx={{ mb: 2, position: 'relative', zIndex: 1 }}>
            {error}
          </Alert>
        )}

        {messages.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(255, 255, 255, 0.8)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <ChatBubbleOutline sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
              Nenhuma mensagem ainda
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, textAlign: 'center', maxWidth: 300 }}>
              Esta conversa ainda não possui mensagens. Envie a primeira mensagem para começar!
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const showDate = shouldShowDateDivider(message, prevMessage);
            const isGrouped = shouldGroupMessage(message, nextMessage);
            const isUser = message.sender === 'user';
            const isAI = message.sender === 'ai';

            return (
              <div key={message.id || `message-${index}`}>
                {showDate && (
                  <DateDivider key={`date-${index}`}>
                    <DateChip label={formatDate(new Date(message.timestamp))} />
                  </DateDivider>
                )}
                
                <MessageGroup $isUser={isUser || message.sender === 'agent'}>
                  <MessageBubble 
                    elevation={2}
                    $isUser={isUser || message.sender === 'agent'}
                    $isAI={isAI}
                  >
                    {/* Sender name for AI/Agent messages */}
                    {(isAI || message.sender === 'agent') && !isUser && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 600, 
                          color: 'rgba(255,255,255,0.8)',
                          mb: 0.5,
                          display: 'block'
                        }}
                      >
                        {isAI ? (
                          <>
                            <SmartToy sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            AI Sofia
                          </>
                        ) : (
                          message.metadata?.agentName || 'Agente'
                        )}
                      </Typography>
                    )}
                    
                    <Typography variant="body1">
                      {message.content}
                    </Typography>
                  </MessageBubble>
                  
                  {!isGrouped && (
                    <MessageMeta $isUser={isUser || message.sender === 'agent'}>
                      <AccessTime sx={{ fontSize: '0.75rem' }} />
                      <Typography variant="caption">
                        {formatTime(new Date(message.timestamp))}
                      </Typography>
                      <StatusIcon $status={message.status}>
                        {getStatusIcon(message)}
                      </StatusIcon>
                    </MessageMeta>
                  )}
                </MessageGroup>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </MessagesArea>

      {/* Input Area */}
      <InputArea elevation={0}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            variant="outlined"
            size="small"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                backgroundColor: '#1e2a38',
                color: 'white',
                '& fieldset': {
                  borderColor: '#3a4750',
                },
                '&:hover fieldset': {
                  borderColor: '#128c7e',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#25d366',
                },
              },
              '& .MuiInputBase-input': {
                color: 'white',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255,255,255,0.7)',
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    <EmojiEmotions />
                  </IconButton>
                  <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    <AttachFile />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <IconButton
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            sx={{
              bgcolor: '#25d366', // WhatsApp green
              color: 'white',
              width: 48,
              height: 48,
              '&:hover': {
                bgcolor: '#128c7e',
              },
              '&:disabled': {
                bgcolor: '#3a4750',
              },
            }}
          >
            {sending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Send />
            )}
          </IconButton>
        </Box>
      </InputArea>
    </ConversationContainer>
  );
}