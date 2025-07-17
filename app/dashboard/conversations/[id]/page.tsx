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
} from '@mui/icons-material';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Styled Components
const ConversationContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.grey[50],
  overflow: 'hidden',
}));

const Header = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: 0,
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
  zIndex: 1000,
}));

const MessagesArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  backgroundColor: '#fafafa',
  padding: theme.spacing(2, 0),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.grey[300],
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.grey[400],
  },
}));

const MessageBubble = styled(Paper)(({ theme, isUser, isAI }) => ({
  padding: theme.spacing(1.5, 2),
  maxWidth: '70%',
  marginLeft: isUser ? 'auto' : 0,
  marginRight: isUser ? 0 : 'auto',
  borderRadius: 18,
  backgroundColor: isUser 
    ? theme.palette.primary.main 
    : isAI 
      ? alpha(theme.palette.info.main, 0.1)
      : theme.palette.background.paper,
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  boxShadow: isUser 
    ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
    : `0 1px 4px ${alpha(theme.palette.grey[500], 0.1)}`,
  position: 'relative',
  wordBreak: 'break-word',
  '&::before': isUser ? {
    content: '""',
    position: 'absolute',
    bottom: 0,
    right: -6,
    width: 0,
    height: 0,
    borderLeft: `12px solid ${theme.palette.primary.main}`,
    borderBottom: '12px solid transparent',
  } : {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: -6,
    width: 0,
    height: 0,
    borderRight: `12px solid ${isAI ? alpha(theme.palette.info.main, 0.1) : theme.palette.background.paper}`,
    borderBottom: '12px solid transparent',
  },
  [theme.breakpoints.down('sm')]: {
    maxWidth: '85%',
  },
}));

const MessageInputContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  display: 'flex',
  alignItems: 'flex-end',
  gap: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderRadius: 0,
  borderTop: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 -1px 8px rgba(0,0,0,0.06)',
}));

const MessageInput = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 24,
    backgroundColor: theme.palette.grey[50],
    '&:hover': {
      backgroundColor: theme.palette.grey[100],
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
}));

const SendButton = styled(IconButton)(({ theme }) => ({
  width: 48,
  height: 48,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '&:disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },
}));

const DateDivider = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  margin: theme.spacing(2, 0),
  padding: theme.spacing(0, 3),
  '& .MuiDivider-root': {
    flex: 1,
    borderColor: theme.palette.grey[200],
  },
}));

const StatusIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  '& .MuiSvgIcon-root': {
    fontSize: 14,
    opacity: 0.7,
  },
}));

const OnlineIndicator = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: '#4CAF50',
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.5,
    },
    '100%': {
      opacity: 1,
    },
  },
}));

// Interfaces
interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender?: 'user' | 'ai' | 'agent';
  type: 'text' | 'image' | 'audio' | 'document';
  direction?: 'inbound' | 'outbound';
  isFromAI?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
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
  clientAvatar?: string;
  clientEmail?: string;
  platform: 'whatsapp' | 'email' | 'phone';
  status: 'active' | 'closed' | 'pending' | 'completed';
  lastMessage: Date;
  aiEnabled: boolean;
  totalMessages: number;
  tags: string[];
  unreadCount?: number;
  isStarred?: boolean;
  clientTyping?: boolean;
  agentId?: string;
  assignedAgent?: string;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    loadConversationData();
    // Set up real-time updates
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationData = async () => {
    try {
      setLoading(true);
      
      // Fetch conversation data
      const conversationResponse = await fetch(`/api/conversations/${params.id}`);
      if (!conversationResponse.ok) {
        throw new Error('Failed to fetch conversation');
      }
      
      const conversationData = await conversationResponse.json();
      const conversation = conversationData.conversation;
      
      // Transform conversation data
      const transformedConversation: Conversation = {
        id: conversation.id,
        clientName: conversation.clientName || 'Cliente',
        clientPhone: conversation.whatsappPhone || conversation.clientPhone || '',
        clientAvatar: conversation.clientAvatar,
        clientEmail: conversation.clientEmail,
        platform: 'whatsapp' as const,
        status: conversation.status || 'active',
        lastMessage: conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : new Date(),
        aiEnabled: true,
        totalMessages: conversation.messages?.length || 0,
        tags: conversation.tags || [],
        unreadCount: conversation.unreadCount || 0,
        isStarred: conversation.isStarred || false,
        agentId: conversation.agentId,
        assignedAgent: conversation.assignedAgent || 'AI Sofia'
      };
      
      setConversation(transformedConversation);
      await loadMessages();
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError('Erro ao carregar conversa');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
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
          fileSize: msg.fileSize
        }
      }));
      
      setMessages(transformedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
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
          delivered: false, 
          read: false, 
          agentName: 'Você' 
        },
      };

      setMessages(prev => [...prev, tempMessage]);

      // Send via API
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Handle file upload logic here
    console.log('File selected:', file);
  };

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ptBR });
    } else if (isYesterday(date)) {
      return `Ontem ${format(date, 'HH:mm', { locale: ptBR })}`;
    } else {
      return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    }
  };

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) {
      return 'Hoje';
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, "d 'de' MMMM", { locale: ptBR });
    }
  };

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent': return <Check sx={{ color: 'inherit' }} />;
      case 'delivered': return <DoneAll sx={{ color: 'inherit' }} />;
      case 'read': return <DoneAll sx={{ color: '#4FC3F7' }} />;
      case 'failed': return <Schedule sx={{ color: 'error.main' }} />;
      default: return null;
    }
  };

  const toggleStarred = async () => {
    if (!conversation) return;
    
    try {
      await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !conversation.isStarred })
      });
      
      setConversation({ ...conversation, isStarred: !conversation.isStarred });
    } catch (err) {
      console.error('Error toggling starred:', err);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user';
    const isAI = message.sender === 'ai' || message.isFromAI;

    return (
      <Box sx={{ px: 3, mb: 1 }}>
        <MessageBubble isUser={isUser} isAI={isAI} elevation={0}>
          {/* AI Badge */}
          {isAI && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <SmartToy sx={{ fontSize: 14, color: 'info.main' }} />
              <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 500 }}>
                AI Sofia
              </Typography>
            </Box>
          )}

          {/* Message Content */}
          {message.type === 'image' ? (
            <Box>
              <Box
                component="img"
                src={message.metadata?.mediaUrl || '/placeholder.jpg'}
                sx={{
                  width: '100%',
                  maxWidth: 280,
                  height: 'auto',
                  borderRadius: 2,
                  mb: message.content ? 1 : 0
                }}
              />
              {message.content && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </Typography>
              )}
            </Box>
          ) : message.type === 'document' ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 1,
              bgcolor: alpha('#000', 0.05),
              borderRadius: 1
            }}>
              <InsertDriveFile sx={{ color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {message.metadata?.fileName || 'Documento'}
                </Typography>
                {message.metadata?.fileSize && (
                  <Typography variant="caption" color="text.secondary">
                    {(message.metadata.fileSize / 1024).toFixed(1)} KB
                  </Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          )}

          {/* Message Status */}
          <StatusIndicator>
            <Typography variant="caption" sx={{ fontSize: 11, opacity: 0.7 }}>
              {formatMessageTime(message.timestamp)}
            </Typography>
            {!isUser && getStatusIcon(message.status)}
          </StatusIndicator>
        </MessageBubble>
      </Box>
    );
  };

  if (loading) {
    return (
      <ConversationContainer>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%' 
        }}>
          <CircularProgress />
        </Box>
      </ConversationContainer>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!conversation) return <Alert severity="error">Conversa não encontrada</Alert>;

  return (
    <ConversationContainer>
      {/* Header */}
      <Header elevation={0}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        
        <Avatar 
          src={conversation.clientAvatar}
          sx={{ 
            width: 40, 
            height: 40,
            bgcolor: 'primary.main',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {conversation.clientName?.[0] || '?'}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
              {conversation.clientName}
            </Typography>
            <WhatsApp sx={{ color: '#25D366', fontSize: 16 }} />
            {conversation.aiEnabled && (
              <Tooltip title="IA Ativada">
                <SmartToy sx={{ color: 'primary.main', fontSize: 16 }} />
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
              {conversation.clientPhone}
            </Typography>
            {conversation.status === 'active' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <OnlineIndicator />
                <Typography variant="caption" sx={{ color: '#4CAF50', fontSize: 12 }}>
                  Online
                </Typography>
              </Box>
            )}
            {isTyping && (
              <Typography variant="caption" color="primary.main" sx={{ fontSize: 12 }}>
                digitando...
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton onClick={toggleStarred} size="small">
            {conversation.isStarred ? <Star sx={{ color: '#FFB300' }} /> : <StarBorder />}
          </IconButton>
          
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <MoreVert />
          </IconButton>
        </Box>
      </Header>

      {/* Messages Area */}
      <MessagesArea>
        {messages.length > 0 ? (
          <>
            {messages.map((message, index) => {
              const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);
              
              return (
                <Box key={message.id}>
                  {showDateSeparator && (
                    <DateDivider>
                      <Divider />
                      <Chip 
                        label={formatDateSeparator(message.timestamp)}
                        size="small"
                        sx={{ 
                          mx: 2,
                          bgcolor: 'background.paper',
                          fontSize: 12,
                          height: 24,
                          fontWeight: 500,
                        }}
                      />
                      <Divider />
                    </DateDivider>
                  )}
                  
                  <Fade in timeout={300}>
                    <div>{renderMessage(message)}</div>
                  </Fade>
                </Box>
              );
            })}
          </>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: 'text.secondary'
          }}>
            <WhatsApp sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" gutterBottom>
              Nenhuma mensagem ainda
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Inicie uma conversa enviando uma mensagem
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </MessagesArea>

      {/* Message Input */}
      <MessageInputContainer elevation={0}>
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx"
        />
        
        <IconButton 
          onClick={handleFileSelect}
          sx={{ color: 'text.secondary' }}
        >
          <AttachFile />
        </IconButton>
        
        <MessageInput
          fullWidth
          multiline
          maxRows={4}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          size="small"
          disabled={sending}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <EmojiEmotions />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <SendButton
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? <CircularProgress size={20} color="inherit" /> : <Send />}
        </SendButton>
      </MessageInputContainer>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: { minWidth: 180 }
        }}
      >
        <MenuItem onClick={() => {
          setAnchorEl(null);
          // Handle block contact
        }}>
          <Block fontSize="small" sx={{ mr: 1 }} />
          Bloquear contato
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          // Handle delete conversation
        }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Apagar conversa
        </MenuItem>
      </Menu>
    </ConversationContainer>
  );
}