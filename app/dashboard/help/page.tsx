'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  Paper,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  Search,
  QuestionAnswer,
  Settings,
  WhatsApp,
  Analytics,
  Security,
  Home,
  People,
  Phone,
  Email,
  Launch,
  Book,
  VideoLibrary,
  Support,
  BugReport,
} from '@mui/icons-material';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'geral' | 'whatsapp' | 'propriedades' | 'clientes' | 'tecnico';
  tags: string[];
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Como configurar o WhatsApp Business API?',
    answer: 'Para configurar o WhatsApp Business API, acesse a página de Configurações > WhatsApp e siga o guia passo a passo. Você precisará criar uma conta Meta Business, configurar um app no Facebook Developers e obter as credenciais necessárias.',
    category: 'whatsapp',
    tags: ['configuração', 'whatsapp', 'api'],
  },
  {
    id: '2',
    question: 'Como adicionar uma nova propriedade?',
    answer: 'Vá para Propriedades > Nova Propriedade ou clique no botão "+" no canto inferior direito. Preencha as informações básicas, adicione fotos e configure os preços. O sistema suporta upload de múltiplas imagens e vídeos.',
    category: 'propriedades',
    tags: ['propriedades', 'cadastro', 'imóveis'],
  },
  {
    id: '3',
    question: 'O que fazer se o agente IA não está respondendo?',
    answer: 'Verifique se: 1) As credenciais WhatsApp estão corretas, 2) O webhook está configurado, 3) A conexão com OpenAI está funcionando. Teste a conexão em Configurações > WhatsApp > Testar Conexão.',
    category: 'tecnico',
    tags: ['ia', 'problemas', 'troubleshooting'],
  },
  {
    id: '4',
    question: 'Como visualizar o histórico de conversas?',
    answer: 'Acesse Conversas para ver todas as interações. Você pode filtrar por status, buscar por nome do cliente ou palavra-chave. Clique em qualquer conversa para ver o histórico completo.',
    category: 'whatsapp',
    tags: ['conversas', 'histórico', 'mensagens'],
  },
  {
    id: '5',
    question: 'Como gerenciar clientes e leads?',
    answer: 'Na seção Clientes, você pode visualizar todos os contatos, ver scores de engajamento, filtrar por status e acompanhar o pipeline de vendas. O sistema automaticamente categoriza leads e clientes ativos.',
    category: 'clientes',
    tags: ['clientes', 'leads', 'crm'],
  },
  {
    id: '6',
    question: 'Como personalizar as respostas do agente IA?',
    answer: 'Vá em Configurações > Assistente IA para personalizar a personalidade, tom de voz e instruções específicas. Você pode escolher entre estilos formal, amigável ou casual.',
    category: 'geral',
    tags: ['ia', 'personalização', 'configuração'],
  },
];

const quickLinks = [
  {
    title: 'Documentação Completa',
    description: 'Guia completo do sistema',
    icon: <Book />,
    url: '#',
  },
  {
    title: 'Vídeos Tutoriais',
    description: 'Aprenda com vídeos práticos',
    icon: <VideoLibrary />,
    url: '#',
  },
  {
    title: 'Suporte Técnico',
    description: 'Fale com nossa equipe',
    icon: <Support />,
    url: '#',
  },
  {
    title: 'Reportar Bug',
    description: 'Encontrou um problema?',
    icon: <BugReport />,
    url: '#',
  },
];

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'todas' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'todas', label: 'Todas as Categorias', icon: <QuestionAnswer /> },
    { value: 'geral', label: 'Geral', icon: <Settings /> },
    { value: 'whatsapp', label: 'WhatsApp', icon: <WhatsApp /> },
    { value: 'propriedades', label: 'Propriedades', icon: <Home /> },
    { value: 'clientes', label: 'Clientes', icon: <People /> },
    { value: 'tecnico', label: 'Técnico', icon: <BugReport /> },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Central de Ajuda
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Encontre respostas para suas dúvidas e aprenda a usar o sistema
        </Typography>
      </Box>

      {/* Search and Filter */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Buscar por perguntas, respostas ou palavras-chave..."
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
                label="Categoria"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                SelectProps={{
                  native: true,
                }}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* FAQ Section */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Perguntas Frequentes
              </Typography>
              
              {filteredFAQs.length === 0 ? (
                <Alert severity="info">
                  Nenhuma pergunta encontrada com os critérios de busca.
                </Alert>
              ) : (
                <Box>
                  {filteredFAQs.map((faq) => (
                    <Accordion key={faq.id} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                            {faq.question}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                            {faq.tags.slice(0, 2).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="text.secondary">
                          {faq.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Links */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Links Rápidos
              </Typography>
              
              <List>
                {quickLinks.map((link, index) => (
                  <ListItem 
                    key={index} 
                    button 
                    component="a" 
                    href={link.url}
                    target="_blank"
                    sx={{ borderRadius: 1, mb: 1 }}
                  >
                    <ListItemIcon>
                      {link.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={link.title}
                      secondary={link.description}
                    />
                    <Launch fontSize="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Precisa de Mais Ajuda?
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Nossa equipe está pronta para ajudar você com qualquer dúvida.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Email />}
                  href="mailto:suporte@locai.com"
                  fullWidth
                >
                  Enviar Email
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Phone />}
                  href="tel:+5511000000000"
                  fullWidth
                >
                  Ligar para Suporte
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<WhatsApp />}
                  href="https://wa.me/5521999999999"
                  target="_blank"
                  fullWidth
                >
                  WhatsApp
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status do Sistema
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="API WhatsApp"
                    secondary="Operacional"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="Agente IA"
                    secondary="Operacional"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'warning.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="Banco de Dados"
                    secondary="Manutenção"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Getting Started Guide */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Guia de Início Rápido
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Settings color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  1. Configurar WhatsApp
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure as credenciais do WhatsApp Business API
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Home color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  2. Adicionar Propriedades
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cadastre seus imóveis com fotos e descrições
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <QuestionAnswer color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  3. Treinar o Agente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Personalize as respostas do assistente IA
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Analytics color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  4. Acompanhar Resultados
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monitore conversas e performance
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}