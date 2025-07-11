'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
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
} from '@mui/material';
import {
  ArrowBack,
  Send,
  WhatsApp,
  Phone,
  Email,
  SmartToy,
  Person,
  Attachment,
  MoreVert,
  Settings,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'ai' | 'agent';
  type: 'text' | 'image' | 'audio' | 'document';
  metadata?: {
    delivered?: boolean;
    read?: boolean;
    clientName?: string;
    agentName?: string;
  };
}

interface Conversation {
  id: string;
  clientName: string;
  clientPhone: string;
  clientAvatar?: string;
  platform: 'whatsapp' | 'email' | 'phone';
  status: 'active' | 'closed' | 'pending';
  lastMessage: Date;
  aiEnabled: boolean;
  totalMessages: number;
  tags: string[];
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConversationData();
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
      
      // Fetch conversation data from Firebase
      const conversationData = await fetch(`/api/conversations/${params.id}`);
      if (!conversationData.ok) {
        throw new Error('Failed to fetch conversation');
      }
      
      const conversation = await conversationData.json();
      
      // Fetch messages data
      const messagesData = await fetch(`/api/conversations/${params.id}/messages`);
      const messages = messagesData.ok ? await messagesData.json() : [];
      
      setConversation(conversation);
      setMessages(messages);
    } catch (err) {
      setError('Erro ao carregar conversa');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      const newMsg: Message = {
        id: Date.now().toString(),
        content: messageToSend,
        timestamp: new Date(),
        sender: 'agent',
        type: 'text',
        metadata: { delivered: false, read: false, agentName: 'Você' },
      };

      setMessages(prev => [...prev, newMsg]);

      // API call to send message would go here
      // await sendMessage(conversation?.id, messageToSend);

      // Simulate AI response after a delay
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Mensagem recebida. O agente irá responder em breve.',
          timestamp: new Date(),
          sender: 'ai',
          type: 'text',
          metadata: { delivered: true, read: false },
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);

    } catch (err) {
      setError('Erro ao enviar mensagem');
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

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return <WhatsApp color="success" />;
      case 'email': return <Email color="primary" />;
      case 'phone': return <Phone color="secondary" />;
      default: return null;
    }
  };

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case 'ai': return <SmartToy color="primary" />;
      case 'agent': return <Person color="secondary" />;
      default: return null;
    }
  };

  const getSenderName = (message: Message) => {
    switch (message.sender) {
      case 'user': return message.metadata?.clientName || 'Cliente';
      case 'ai': return 'Agente IA';
      case 'agent': return message.metadata?.agentName || 'Agente';
      default: return 'Desconhecido';
    }
  };

  const getMessageAlignment = (sender: string) => {
    return sender === 'user' ? 'flex-end' : 'flex-start';
  };

  const getMessageColor = (sender: string) => {
    switch (sender) {
      case 'user': return 'primary.main';
      case 'ai': return 'secondary.main';
      case 'agent': return 'info.main';
      default: return 'grey.500';
    }
  };

  if (loading) return <Box>Carregando...</Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!conversation) return <Alert severity="error">Conversa não encontrada</Alert>;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 0,
        }}
      >
        <IconButton onClick={() => router.back()}>
          <ArrowBack />
        </IconButton>
        
        <Avatar src={conversation.clientAvatar} sx={{ width: 40, height: 40 }}>
          {conversation.clientName[0]}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">{conversation.clientName}</Typography>
            {getPlatformIcon(conversation.platform)}
            {conversation.aiEnabled && (
              <Tooltip title="IA Ativada">
                <SmartToy color="primary" fontSize="small" />
              </Tooltip>
            )}
          </Box>
          <Typography variant="body2" color="textSecondary">
            {conversation.clientPhone} • {conversation.totalMessages} mensagens
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {conversation.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>

        <IconButton>
          <Settings />
        </IconButton>
        <IconButton>
          <MoreVert />
        </IconButton>
      </Paper>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: 'grey.50',
        }}
      >
        <List sx={{ py: 0 }}>
          {messages.map((message, index) => (
            <ListItem
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: getMessageAlignment(message.sender),
                py: 0.5,
              }}
            >
              <Box
                sx={{
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: getMessageAlignment(message.sender),
                }}
              >
                {/* Sender info */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 0.5,
                    alignSelf: getMessageAlignment(message.sender),
                  }}
                >
                  {getSenderIcon(message.sender)}
                  <Typography variant="caption" color="textSecondary">
                    {getSenderName(message)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {format(message.timestamp, 'HH:mm', { locale: ptBR })}
                  </Typography>
                </Box>

                {/* Message bubble */}
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'white',
                    color: message.sender === 'user' ? 'white' : 'text.primary',
                    borderRadius: 2,
                    borderTopLeftRadius: message.sender === 'user' ? 2 : 0.5,
                    borderTopRightRadius: message.sender === 'user' ? 0.5 : 2,
                  }}
                >
                  {message.type === 'image' ? (
                    <Box>
                      <Box
                        sx={{
                          width: 200,
                          height: 150,
                          bgcolor: 'grey.200',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1,
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">
                          [Imagem]
                        </Typography>
                      </Box>
                      <Typography variant="body2">{message.content}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2">{message.content}</Typography>
                  )}
                </Paper>

                {/* Message status */}
                {message.sender !== 'user' && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                    {message.metadata?.delivered
                      ? message.metadata?.read
                        ? 'Lida'
                        : 'Entregue'
                      : 'Enviando...'}
                  </Typography>
                )}
              </Box>
            </ListItem>
          ))}
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
        }}
      >
        <IconButton color="primary">
          <Attachment />
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
        />
        
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Send />
        </IconButton>
      </Paper>
    </Box>
  );
}