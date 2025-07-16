'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Stack,
  Chip,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  People,
  Business,
  CalendarMonth,
  AttachMoney,
  ArrowForward,
  Phone,
  Email,
  LocationOn,
  Schedule,
  AccountBalanceWallet,
} from '@mui/icons-material';

interface RelatedRecord {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  metadata?: Record<string, any>;
  type: 'client' | 'property' | 'reservation' | 'transaction';
}

interface RelatedRecordsNavigationProps {
  records: RelatedRecord[];
  title?: string;
  maxItems?: number;
  showMetadata?: boolean;
}

const RECORD_CONFIG = {
  client: {
    icon: <People />,
    color: 'primary',
    route: (id: string) => `/dashboard/clients/${id}`,
    avatarColor: '#1976d2',
  },
  property: {
    icon: <Business />,
    color: 'secondary',
    route: (id: string) => `/dashboard/properties/${id}`,
    avatarColor: '#9c27b0',
  },
  reservation: {
    icon: <CalendarMonth />,
    color: 'success',
    route: (id: string) => `/dashboard/reservations/${id}`,
    avatarColor: '#2e7d32',
  },
  transaction: {
    icon: <AttachMoney />,
    color: 'warning',
    route: (id: string) => `/dashboard/financeiro/transacoes/${id}`,
    avatarColor: '#ed6c02',
  },
} as const;

const STATUS_COLORS = {
  active: 'success',
  pending: 'warning',
  cancelled: 'error',
  completed: 'info',
  draft: 'default',
} as const;

export default function RelatedRecordsNavigation({
  records,
  title = 'Registros Relacionados',
  maxItems = 5,
  showMetadata = true,
}: RelatedRecordsNavigationProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();

  const displayRecords = records.slice(0, maxItems);

  const handleNavigate = (record: RelatedRecord) => {
    const config = RECORD_CONFIG[record.type];
    router.push(config.route(record.id));
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'default';
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'default';
  };

  const renderMetadata = (record: RelatedRecord) => {
    if (!showMetadata || !record.metadata) return null;

    const { type, metadata } = record;
    
    switch (type) {
      case 'client':
        return (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {metadata.phone && (
              <Tooltip title="Telefone">
                <Chip
                  icon={<Phone />}
                  label={metadata.phone}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {metadata.email && (
              <Tooltip title="Email">
                <Chip
                  icon={<Email />}
                  label={metadata.email}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Stack>
        );
      
      case 'property':
        return (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {metadata.location && (
              <Tooltip title="Localização">
                <Chip
                  icon={<LocationOn />}
                  label={metadata.location}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {metadata.price && (
              <Tooltip title="Preço">
                <Chip
                  icon={<AttachMoney />}
                  label={`R$ ${metadata.price}`}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Stack>
        );
      
      case 'reservation':
        return (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {metadata.checkIn && (
              <Tooltip title="Check-in">
                <Chip
                  icon={<Schedule />}
                  label={metadata.checkIn}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {metadata.total && (
              <Tooltip title="Total">
                <Chip
                  icon={<AttachMoney />}
                  label={`R$ ${metadata.total}`}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Stack>
        );
      
      case 'transaction':
        return (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {metadata.amount && (
              <Tooltip title="Valor">
                <Chip
                  icon={<AccountBalanceWallet />}
                  label={`R$ ${metadata.amount}`}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {metadata.date && (
              <Tooltip title="Data">
                <Chip
                  icon={<Schedule />}
                  label={metadata.date}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Stack>
        );
      
      default:
        return null;
    }
  };

  if (records.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Nenhum registro relacionado encontrado
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardHeader
        title={title}
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        <Stack divider={<Divider />} spacing={2}>
          {displayRecords.map((record, index) => {
            const config = RECORD_CONFIG[record.type];
            
            return (
              <Box key={record.id}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 1,
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  onClick={() => handleNavigate(record)}
                >
                  <Avatar
                    sx={{
                      bgcolor: config.avatarColor,
                      width: 40,
                      height: 40,
                      mt: 0.5,
                    }}
                  >
                    {config.icon}
                  </Avatar>
                  
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {record.title}
                      </Typography>
                      {record.status && (
                        <Chip
                          label={record.status}
                          size="small"
                          color={getStatusColor(record.status)}
                          sx={{ minWidth: 0 }}
                        />
                      )}
                    </Box>
                    
                    {record.subtitle && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {record.subtitle}
                      </Typography>
                    )}
                    
                    {record.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {record.description}
                      </Typography>
                    )}
                    
                    {renderMetadata(record)}
                  </Box>
                  
                  <IconButton
                    size="small"
                    sx={{ mt: 0.5 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(record);
                    }}
                  >
                    <ArrowForward />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Stack>
        
        {records.length > maxItems && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              +{records.length - maxItems} registros relacionados
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}