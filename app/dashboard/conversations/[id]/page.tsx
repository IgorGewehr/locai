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
  List,
  ListItem,
  Divider,
  Alert,
  Paper,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Menu,
  MenuItem,
  Skeleton,
  Fade,
  Zoom,
} from '@mui/material';
import {
  ArrowBack,
  Send,
  WhatsApp,
  Phone,
  Email,
  SmartToy,
  Person,
  AttachFile,
  MoreVert,
  Settings,
  Image as ImageIcon,
  InsertDriveFile,
  Mic,
  EmojiEmotions,
  CheckCircle,
  Check,
  DoneAll,
  Schedule,
  Star,
  StarBorder,
  Delete,
  Block,
} from '@mui/icons-material';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
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
      return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
    }
  };

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return <WhatsApp sx={{ color: '#25D366' }} />;
      case 'email': return <Email color="primary" />;
      case 'phone': return <Phone color="secondary" />;
      default: return null;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent': return <Check sx={{ fontSize: 16, color: 'text.secondary' }} />;
      case 'delivered': return <DoneAll sx={{ fontSize: 16, color: 'text.secondary' }} />;
      case 'read': return <DoneAll sx={{ fontSize: 16, color: '#4FC3F7' }} />;
      case 'failed': return <Schedule sx={{ fontSize: 16, color: 'error.main' }} />;
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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="40%" height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="50%" height={40} />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!conversation) return <Alert severity="error">Conversa não encontrada</Alert>;

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default' 
    }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 0,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <IconButton onClick={() => router.back()} sx={{ p: 1 }}>
          <ArrowBack />
        </IconButton>
        
        <Avatar 
          src={conversation.clientAvatar}
          sx={{ 
            width: 48, 
            height: 48,
            bgcolor: 'primary.main' 
          }}
        >
          {conversation.clientName?.[0] || '?'}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {conversation.clientName}
            </Typography>
            {getPlatformIcon(conversation.platform)}
            {conversation.aiEnabled && (
              <Tooltip title="IA Ativada">
                <SmartToy sx={{ color: 'primary.main', fontSize: 20 }} />
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {conversation.clientPhone}
            </Typography>
            {conversation.status === 'active' && (
              <Chip 
                label="Online" 
                size="small" 
                sx={{ 
                  height: 20,
                  bgcolor: '#4CAF50',
                  color: 'white',
                  fontSize: '0.75rem'
                }} 
              />
            )}
            {isTyping && (
              <Typography variant="caption" color="primary.main" sx={{ ml: 1 }}>
                digitando...
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {conversation.tags.map((tag) => (
            <Chip 
              key={tag} 
              label={tag} 
              size="small" 
              variant="outlined"
              sx={{ borderRadius: 2 }}
            />
          ))}
          
          <IconButton onClick={toggleStarred}>
            {conversation.isStarred ? <Star color="warning" /> : <StarBorder />}
          </IconButton>
          
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
        </Box>
      </Paper>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          bgcolor: '#F5F7FA',
          backgroundImage: 'radial-gradient(circle at 1px 1px, #E0E0E0 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        <List sx={{ py: 2, px: { xs: 1, sm: 2, md: 3 } }}>
          {messages.length > 0 ? messages.map((message, index) => {
            const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);
            const isUser = message.sender === 'user';
            const isAI = message.sender === 'ai' || message.isFromAI;
            
            return (
              <Box key={message.id}>
                {showDateSeparator && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    my: 2,
                    px: 2 
                  }}>
                    <Divider sx={{ flex: 1 }} />
                    <Chip 
                      label={formatDateSeparator(message.timestamp)}
                      size="small"
                      sx={{ 
                        mx: 2,
                        bgcolor: 'background.paper',
                        fontSize: '0.75rem'
                      }}
                    />
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}
                
                <ListItem
                  sx={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-start' : 'flex-end',
                    py: 0.5,
                    px: { xs: 1, sm: 2 }
                  }}
                >
                  <Fade in timeout={300}>
                    <Box
                      sx={{
                        maxWidth: { xs: '85%', sm: '70%', md: '60%' },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-start' : 'flex-end',
                      }}
                    >
                      {/* Message Bubble */}
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          bgcolor: isUser 
                            ? 'background.paper' 
                            : isAI 
                              ? '#E3F2FD' 
                              : '#E8F5E9',
                          borderRadius: 2,
                          borderTopLeftRadius: isUser ? 0 : 16,
                          borderTopRightRadius: isUser ? 16 : 0,
                          position: 'relative',
                          minWidth: '100px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          '&::before': isUser ? {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: -8,
                            width: 0,
                            height: 0,
                            borderStyle: 'solid',
                            borderWidth: '0 8px 8px 0',
                            borderColor: 'transparent background.paper transparent transparent'
                          } : {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: -8,
                            width: 0,
                            height: 0,
                            borderStyle: 'solid',
                            borderWidth: '0 0 8px 8px',
                            borderColor: isAI 
                              ? 'transparent transparent transparent #E3F2FD'
                              : 'transparent transparent transparent #E8F5E9'
                          }
                        }}
                      >
                        {/* Sender Name */}
                        {(isUser || isAI) && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5, 
                            mb: 0.5 
                          }}>
                            {isAI && <SmartToy sx={{ fontSize: 16, color: 'primary.main' }} />}
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                color: isAI ? 'primary.main' : 'text.secondary'
                              }}
                            >
                              {isUser ? conversation.clientName : 'AI Sofia'}
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
                                maxWidth: 300,
                                height: 'auto',
                                borderRadius: 1,
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
                            bgcolor: 'action.hover',
                            borderRadius: 1
                          }}>
                            <InsertDriveFile color="action" />
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
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            {message.content}
                          </Typography>
                        )}

                        {/* Message Time & Status */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5, 
                          mt: 1,
                          justifyContent: 'flex-end'
                        }}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '0.7rem' }}
                          >
                            {formatMessageTime(message.timestamp)}
                          </Typography>
                          {!isUser && getStatusIcon(message.status)}
                        </Box>
                      </Paper>
                    </Box>
                  </Fade>
                </ListItem>
              </Box>
            );
          }) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 8,
              textAlign: 'center'
            }}>
              <WhatsApp sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma mensagem ainda
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inicie uma conversa enviando uma mensagem
              </Typography>
            </Box>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
          borderRadius: 0,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx"
        />
        
        <IconButton 
          color="primary" 
          onClick={handleFileSelect}
          sx={{ p: 1 }}
        >
          <AttachFile />
        </IconButton>
        
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          variant="outlined"
          size="small"
          disabled={sending}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: 'grey.50'
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  sx={{ mr: -1 }}
                >
                  <EmojiEmotions fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          sx={{ 
            p: 1,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark'
            },
            '&:disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled'
            }
          }}
        >
          {sending ? <CircularProgress size={24} color="inherit" /> : <Send />}
        </IconButton>
        
        <IconButton color="primary" sx={{ p: 1 }}>
          <Mic />
        </IconButton>
      </Paper>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
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
    </Box>
  );
}