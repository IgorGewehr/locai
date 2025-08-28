"use client";

import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Alert,
    Snackbar,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Tab,
    Tabs,
    CircularProgress,
    Backdrop,
    Paper
} from "@mui/material";
import {
    Send as SendIcon,
    Message as MessageIcon,
    BugReport as BugIcon,
    Feedback as FeedbackIcon,
    Support as SupportIcon,
    Close as CloseIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    QuestionAnswer as QuestionIcon,
    HelpOutline as HelpIcon,
    ContactSupport as ContactIcon
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { ticketService } from '@/lib/services/ticket-service';
import { 
    Ticket, 
    TicketListItem, 
    CreateTicketRequest,
    CreateTicketResponseRequest 
} from '@/lib/types/ticket';
import { logger } from '@/lib/utils/logger';

export default function HelpPage() {
    // Estados básicos
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingTicket, setLoadingTicket] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    // Estados do formulário
    const [newTicket, setNewTicket] = useState<CreateTicketRequest>({
        subject: "",
        content: "",
        type: "support",
        priority: "medium"
    });

    // Estados dos tickets
    const [tickets, setTickets] = useState<TicketListItem[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [newResponse, setNewResponse] = useState("");

    const { tenant } = useTenant();
    const { user } = useAuth();

    // Carregar tickets do usuário
    const loadUserTickets = async () => {
        if (!user?.uid || !tenant?.id) {
            logger.warn('Usuário ou tenant não encontrado');
            return;
        }

        setLoading(true);
        setError('');

        try {
            logger.info('🎫 Carregando tickets do usuário', { userId: user.uid, tenantId: tenant.id });
            
            const response = await ticketService.getUserTickets(tenant.id, user.uid);
            setTickets(response.tickets);
            
            logger.info('✅ Tickets carregados', { count: response.tickets.length });
        } catch (error) {
            logger.error('❌ Erro ao carregar tickets', { error: error.message });
            setError('Erro ao carregar suas mensagens. Tente novamente.');
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    // Enviar novo ticket
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid || !tenant?.id || !newTicket.subject.trim() || !newTicket.content.trim()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            logger.info('🎫 Enviando novo ticket', { subject: newTicket.subject });

            await ticketService.createTicket(
                tenant.id,
                user.uid,
                user.displayName || user.email,
                user.email,
                newTicket
            );

            // Limpar formulário
            setNewTicket({ 
                subject: "", 
                content: "", 
                type: "support", 
                priority: "medium" 
            });
            setShowSuccess(true);

            // Recarregar tickets
            setTimeout(() => {
                loadUserTickets();
            }, 1500);

        } catch (error) {
            logger.error('❌ Erro ao enviar ticket', { error: error.message });
            setError('Erro ao enviar mensagem: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Abrir ticket
    const handleTicketClick = async (ticket: TicketListItem) => {
        if (!tenant?.id) return;

        setLoadingTicket(true);
        try {
            logger.info('🔔 Abrindo ticket', { ticketId: ticket.id });
            
            const response = await ticketService.getTicketDetail(tenant.id, ticket.id);
            setSelectedTicket(response.ticket);
            setOpenDialog(true);

            // Marcar como lido se há respostas não lidas
            if (ticket.hasUnreadAdminResponses) {
                try {
                    await ticketService.markAsRead(tenant.id, ticket.id, user.isAdmin || false);
                    await loadUserTickets();
                } catch (error) {
                    logger.error('❌ Erro ao marcar como lido', { error: error.message });
                }
            }
        } catch (error) {
            logger.error('❌ Erro ao carregar ticket', { error: error.message });
            setError('Erro ao carregar conversa: ' + error.message);
        } finally {
            setLoadingTicket(false);
        }
    };

    // Enviar resposta
    const handleSendResponse = async () => {
        if (!newResponse.trim() || !selectedTicket || !tenant?.id || !user?.uid) return;

        try {
            logger.info('📤 Enviando resposta do usuário');

            await ticketService.addResponse(tenant.id, selectedTicket.id, {
                content: newResponse.trim(),
                isAdmin: user.isAdmin || false, // Use the computed property
                authorId: user.uid,
                authorName: user.displayName || user.email,
                authorEmail: user.email
            });

            setNewResponse("");

            // Recarregar ticket
            const response = await ticketService.getTicketDetail(tenant.id, selectedTicket.id);
            setSelectedTicket(response.ticket);
            
            // Recarregar lista de tickets
            await loadUserTickets();
        } catch (error) {
            logger.error('❌ Erro ao enviar resposta', { error: error.message });
            setError('Erro ao enviar resposta: ' + error.message);
        }
    };

    // Carregar dados ao montar componente
    useEffect(() => {
        if (user?.uid && tenant?.id) {
            loadUserTickets();
        }
    }, [user?.uid, tenant?.id]);

    // Funções auxiliares
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bug':
                return <BugIcon sx={{ color: 'error.main' }} />;
            case 'feedback':
                return <FeedbackIcon sx={{ color: 'primary.main' }} />;
            case 'support':
                return <SupportIcon sx={{ color: 'warning.main' }} />;
            default:
                return <MessageIcon sx={{ color: 'text.secondary' }} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return 'info';
            case 'in_progress':
                return 'warning';
            case 'resolved':
                return 'success';
            case 'closed':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open':
                return 'Aberto';
            case 'in_progress':
                return 'Em andamento';
            case 'resolved':
                return 'Resolvido';
            case 'closed':
                return 'Fechado';
            default:
                return 'Pendente';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'error';
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'success';
            default:
                return 'default';
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'Crítica';
            case 'high':
                return 'Alta';
            case 'medium':
                return 'Média';
            case 'low':
                return 'Baixa';
            default:
                return 'Média';
        }
    };

    const formatDate = (date: any) => {
        if (!date) return '';
        const messageDate = date.toDate ? date.toDate() : new Date(date);
        return messageDate.toLocaleString('pt-BR');
    };

    // Render do formulário
    const renderNewTicketForm = () => (
        <Paper elevation={1} sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
        }}>
            <Typography variant="h6" sx={{
                color: "primary.main",
                mb: 3,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1
            }}>
                <AddIcon /> Nova Mensagem
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Tipo da mensagem</InputLabel>
                            <Select
                                value={newTicket.type}
                                label="Tipo da mensagem"
                                onChange={(e) => setNewTicket(prev => ({ ...prev, type: e.target.value as any }))}
                                sx={{
                                    borderRadius: '8px',
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                    },
                                }}
                            >
                                <MenuItem value="support">Suporte</MenuItem>
                                <MenuItem value="feedback">Feedback</MenuItem>
                                <MenuItem value="bug">Reportar Bug</MenuItem>
                                <MenuItem value="question">Pergunta</MenuItem>
                                <MenuItem value="feature_request">Solicitação de Recurso</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Prioridade</InputLabel>
                            <Select
                                value={newTicket.priority}
                                label="Prioridade"
                                onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                                sx={{
                                    borderRadius: '8px',
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                    },
                                }}
                            >
                                <MenuItem value="low">Baixa</MenuItem>
                                <MenuItem value="medium">Média</MenuItem>
                                <MenuItem value="high">Alta</MenuItem>
                                <MenuItem value="critical">Crítica</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <TextField
                    fullWidth
                    label="Assunto"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    margin="normal"
                    required
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            '&.Mui-focused fieldset': {
                                borderColor: 'primary.main',
                            },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                            color: 'primary.main',
                        },
                    }}
                />

                <TextField
                    fullWidth
                    label="Descreva sua mensagem"
                    multiline
                    rows={4}
                    value={newTicket.content}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, content: e.target.value }))}
                    margin="normal"
                    required
                    sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            '&.Mui-focused fieldset': {
                                borderColor: 'primary.main',
                            },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                            color: 'primary.main',
                        },
                    }}
                />

                <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
                    sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        textTransform: "none",
                        fontWeight: 500,
                        px: 4,
                        py: 1.2,
                        borderRadius: 2,
                        '&:hover': {
                            bgcolor: "primary.dark",
                        },
                    }}
                >
                    {loading ? 'Enviando...' : 'Enviar Mensagem'}
                </Button>
            </Box>
        </Paper>
    );

    // Render do histórico
    const renderTicketsHistory = () => (
        <Paper elevation={1} sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <MessageIcon /> Suas Mensagens
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={loadUserTickets}
                    disabled={loading}
                    sx={{
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        textTransform: 'none'
                    }}
                >
                    Atualizar
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <CircularProgress sx={{ mr: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        Carregando suas mensagens...
                    </Typography>
                </Box>
            ) : tickets.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <MessageIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                        Você ainda não enviou nenhuma mensagem
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Use a aba "Nova Mensagem" para enviar sua primeira mensagem
                    </Typography>
                </Box>
            ) : (
                <List sx={{ p: 0 }}>
                    {tickets.map((ticket) => (
                        <ListItem
                            key={ticket.id}
                            button
                            onClick={() => handleTicketClick(ticket)}
                            sx={{
                                borderRadius: 2,
                                mb: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                backgroundColor: ticket.hasUnreadAdminResponses
                                    ? 'rgba(37, 99, 235, 0.04)'
                                    : 'transparent',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                }
                            }}
                        >
                            <ListItemIcon>
                                {getTypeIcon(ticket.type)}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: ticket.hasUnreadAdminResponses ? 600 : 500,
                                                flex: 1
                                            }}
                                        >
                                            {ticket.subject}
                                        </Typography>
                                        {ticket.hasUnreadAdminResponses && (
                                            <Chip
                                                label="Nova resposta"
                                                size="small"
                                                color="primary"
                                                sx={{ fontSize: '11px' }}
                                            />
                                        )}
                                    </Box>
                                }
                                secondary={
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                            <Chip
                                                label={getStatusLabel(ticket.status)}
                                                size="small"
                                                color={getStatusColor(ticket.status)}
                                                variant="outlined"
                                            />
                                            <Chip
                                                label={getPriorityLabel(ticket.priority)}
                                                size="small"
                                                color={getPriorityColor(ticket.priority)}
                                                variant="outlined"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate(ticket.updatedAt)}
                                            </Typography>
                                            {ticket.responseCount > 0 && (
                                                <Typography variant="caption" color="primary" sx={{ fontWeight: 500 }}>
                                                    {ticket.responseCount} resposta{ticket.responseCount !== 1 ? 's' : ''}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Paper>
    );

    // Dialog da conversa
    const renderTicketDialog = () => {
        if (!selectedTicket) return null;

        return (
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 2, minHeight: '600px' }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getTypeIcon(selectedTicket.type)}
                        <Box>
                            <Typography variant="h6">
                                {selectedTicket.subject}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    label={getStatusLabel(selectedTicket.status)}
                                    size="small"
                                    color={getStatusColor(selectedTicket.status)}
                                />
                                <Chip
                                    label={getPriorityLabel(selectedTicket.priority)}
                                    size="small"
                                    color={getPriorityColor(selectedTicket.priority)}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {formatDate(selectedTicket.createdAt)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setOpenDialog(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '500px' }}>
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        {/* Mensagem original */}
                        <Box sx={{
                            mb: 3,
                            p: 2,
                            borderRadius: 3,
                            backgroundColor: 'action.hover'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Avatar sx={{ width: 32, height: 32 }}>
                                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                </Avatar>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Você
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatDate(selectedTicket.createdAt)}
                                </Typography>
                            </Box>
                            <Typography variant="body1">
                                {selectedTicket.content}
                            </Typography>
                        </Box>

                        {/* Respostas */}
                        {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                            selectedTicket.responses.map((response) => (
                                <Box
                                    key={response.id}
                                    sx={{
                                        mb: 2,
                                        p: 2,
                                        borderRadius: '12px',
                                        backgroundColor: response.isAdmin
                                            ? 'rgba(37, 99, 235, 0.1)'
                                            : 'action.hover',
                                        ml: response.isAdmin ? 0 : 4,
                                        mr: response.isAdmin ? 4 : 0
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Avatar sx={{
                                            width: 32,
                                            height: 32,
                                            backgroundColor: response.isAdmin ? 'primary.main' : 'text.secondary'
                                        }}>
                                            {response.isAdmin ? 'A' : response.authorName?.charAt(0) || 'U'}
                                        </Avatar>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {response.isAdmin ? 'Administrador' : response.authorName || 'Você'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {formatDate(response.createdAt)}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body1">
                                        {response.content}
                                    </Typography>
                                </Box>
                            ))
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Ainda não há respostas para esta mensagem.
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Campo de resposta */}
                    {!['resolved', 'closed'].includes(selectedTicket.status) && (
                        <Box sx={{
                            p: 2,
                            borderTop: '1px solid',
                            borderTopColor: 'divider',
                            backgroundColor: 'background.default'
                        }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    placeholder="Digite sua resposta..."
                                    value={newResponse}
                                    onChange={(e) => setNewResponse(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            backgroundColor: 'background.paper'
                                        }
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleSendResponse}
                                    disabled={!newResponse.trim()}
                                    sx={{
                                        bgcolor: 'primary.main',
                                        minWidth: '60px',
                                        height: '56px',
                                        borderRadius: 2
                                    }}
                                >
                                    <SendIcon />
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* Mensagem de resolvida */}
                    {['resolved', 'closed'].includes(selectedTicket.status) && (
                        <Box sx={{
                            p: 2,
                            borderTop: '1px solid',
                            borderTopColor: 'divider',
                            backgroundColor: 'success.light',
                            textAlign: 'center'
                        }}>
                            <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                ✅ Esta mensagem foi {selectedTicket.status === 'resolved' ? 'resolvida' : 'fechada'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Se você tiver outras dúvidas, crie uma nova mensagem
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <Box sx={{ 
            maxWidth: "1000px", 
            mx: "auto", 
            p: 3,
            minHeight: '100vh',
            backgroundColor: 'background.default'
        }}>
            {/* Loading backdrop */}
            <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loadingTicket}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CircularProgress color="inherit" />
                    <Typography variant="body2">
                        Carregando conversa...
                    </Typography>
                </Box>
            </Backdrop>

            {/* Cabeçalho */}
            <Typography
                variant="h4"
                component="h1"
                sx={{
                    color: "text.primary",
                    mb: 2,
                    fontWeight: 600,
                    fontSize: { xs: '24px', md: '28px' }
                }}
            >
                Central de Ajuda
            </Typography>

            <Typography
                variant="subtitle1"
                sx={{
                    color: "text.secondary",
                    mb: 4,
                }}
            >
                Como podemos ajudar você hoje?
            </Typography>

            {/* Card de contato direto */}
            <Card sx={{ 
                mb: 4, 
                borderRadius: 3, 
                boxShadow: 'none', 
                border: '1px solid', 
                borderColor: 'divider',
                backgroundColor: 'background.paper'
            }}>
                <CardContent>
                    <Typography
                        variant="h6"
                        sx={{
                            color: "primary.main",
                            mb: 2,
                            fontWeight: 600
                        }}
                    >
                        Contato Direto
                    </Typography>
                    <Typography
                        sx={{
                            color: "text.primary",
                            mb: 1,
                        }}
                    >
                        Para entrar em contato diretamente com nossa equipe:
                    </Typography>
                    <Typography
                        sx={{
                            color: "primary.main",
                            fontWeight: 600,
                            mb: 0,
                            fontSize: '16px',
                            letterSpacing: '0.2px'
                        }}
                    >
                        mediconobolso@gmail.com
                    </Typography>
                </CardContent>
            </Card>

            <Divider sx={{ my: 4, opacity: 0.6 }} />

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 500
                        },
                        '& .Mui-selected': {
                            color: 'primary.main !important'
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: 'primary.main'
                        }
                    }}
                >
                    <Tab label="Nova Mensagem" />
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                Suas Mensagens
                                {tickets.filter(t => t.hasUnreadAdminResponses).length > 0 && (
                                    <Chip
                                        label={tickets.filter(t => t.hasUnreadAdminResponses).length}
                                        size="small"
                                        color="primary"
                                        sx={{ fontSize: '11px', minWidth: '20px' }}
                                    />
                                )}
                            </Box>
                        }
                    />
                </Tabs>
            </Box>

            {/* Conteúdo das tabs */}
            {activeTab === 0 && renderNewTicketForm()}
            {activeTab === 1 && renderTicketsHistory()}

            {/* Dialog de conversa */}
            {renderTicketDialog()}

            {/* Snackbar de sucesso */}
            <Snackbar
                open={showSuccess}
                autoHideDuration={6000}
                onClose={() => setShowSuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setShowSuccess(false)}
                    severity="success"
                    sx={{
                        width: '100%',
                        borderRadius: '8px',
                        '& .MuiAlert-icon': {
                            color: 'primary.main'
                        }
                    }}
                >
                    Mensagem enviada com sucesso! Entraremos em contato em breve.
                </Alert>
            </Snackbar>
        </Box>
    );
}