'use client';

import React, { useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  Person,
  SmartToy,
  AccessTime,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ConversationMessage } from '@/lib/types/conversation-optimized';

interface ConversationThreadProps {
  messages: ConversationMessage[];
  loading?: boolean;
  conversationTitle?: string;
}

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  messages,
  loading = false,
  conversationTitle,
}) => {
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageTime = (date: Date): string => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          Nenhuma mensagem nesta conversa ainda.
        </Typography>
      </Alert>
    );
  }

  return (
    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
      {conversationTitle && (
        <>
          <CardContent sx={{ pb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {conversationTitle}
            </Typography>
          </CardContent>
          <Divider />
        </>
      )}

      <CardContent
        sx={{
          maxHeight: 600,
          overflowY: 'auto',
          p: 3,
          bgcolor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Stack spacing={3}>
          {messages.map((message, index) => {
            const messageDate = new Date(message.timestamp);
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const prevDate = prevMessage ? new Date(prevMessage.timestamp) : null;

            // Show date divider if day changed
            const showDateDivider = !prevDate ||
              messageDate.toDateString() !== prevDate.toDateString();

            return (
              <React.Fragment key={message.id}>
                {showDateDivider && (
                  <Box display="flex" justifyContent="center" my={2}>
                    <Chip
                      label={format(messageDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      size="small"
                      icon={<AccessTime fontSize="small" />}
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                )}

                <Stack spacing={2}>
                  {/* Client Message */}
                  <Box display="flex" justifyContent="flex-start" gap={1.5}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        color: 'info.main',
                        width: 36,
                        height: 36,
                      }}
                    >
                      <Person fontSize="small" />
                    </Avatar>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        bgcolor: 'background.paper',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        borderBottomLeftRadius: 4,
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.clientMessage}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 1 }}
                      >
                        {formatMessageTime(messageDate)}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Sofia Message */}
                  <Box display="flex" justifyContent="flex-end" gap={1.5}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        borderRadius: 2,
                        borderBottomRightRadius: 4,
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.sofiaMessage}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        mt={1}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {formatMessageTime(messageDate)}
                        </Typography>
                        {message.context?.functionsCalled && message.context.functionsCalled.length > 0 && (
                          <Chip
                            label={`${message.context.functionsCalled.length} função(ões)`}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              '& .MuiChip-label': { px: 0.75 }
                            }}
                          />
                        )}
                      </Stack>
                    </Paper>
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        width: 36,
                        height: 36,
                      }}
                    >
                      <SmartToy fontSize="small" />
                    </Avatar>
                  </Box>
                </Stack>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ConversationThread;
