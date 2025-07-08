import React from 'react'
import { 
  Card, 
  CardContent, 
  Avatar, 
  Typography, 
  Box, 
  Chip, 
  List, 
  ListItem, 
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material'
import { 
  Person, 
  Phone, 
  Email, 
  LocationOn, 
  AttachMoney, 
  Home,
  Group,
  History,
  Star
} from '@mui/icons-material'
import { ExtractedClientInfo, ClientPreferences } from '@/lib/types/conversation'
import ClientScore from '../../atoms/ClientScore/ClientScore'

interface ClientProfileProps {
  clientInfo: ExtractedClientInfo
  preferences?: ClientPreferences
  clientScore?: number
  conversationCount?: number
  totalSpent?: number
}

export default function ClientProfile({
  clientInfo,
  preferences,
  clientScore,
  conversationCount = 0,
  totalSpent = 0
}: ClientProfileProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDates = (dates?: { checkIn: Date; checkOut: Date }) => {
    if (!dates) return 'Não informado'
    
    const checkIn = new Date(dates.checkIn).toLocaleDateString('pt-BR')
    const checkOut = new Date(dates.checkOut).toLocaleDateString('pt-BR')
    
    return `${checkIn} a ${checkOut}`
  }

  return (
    <Card>
      <CardContent>
        {/* Header with Avatar and Basic Info */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <Avatar
            sx={{ 
              width: 64, 
              height: 64, 
              bgcolor: 'primary.main',
              fontSize: '1.5rem'
            }}
          >
            {getInitials(clientInfo.name)}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {clientInfo.name || 'Cliente'}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {clientScore !== undefined && (
                <ClientScore score={clientScore} size="small" />
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <History sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {conversationCount} conversa(s)
                </Typography>
              </Box>
            </Box>

            {totalSpent > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="body2" color="warning.main" fontWeight="medium">
                  {formatCurrency(totalSpent)} em reservas
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Contact Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            Informações de Contato
          </Typography>
          
          <List dense>
            {clientInfo.phoneNumber && (
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={clientInfo.phoneNumber}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            )}
            
            {clientInfo.email && (
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={clientInfo.email}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            )}
            
            {clientInfo.location && (
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LocationOn sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={clientInfo.location}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            )}
          </List>
        </Box>

        {/* Booking Preferences */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            Preferências de Hospedagem
          </Typography>
          
          <List dense>
            {clientInfo.guests && (
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Group sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={`${clientInfo.guests} hóspede(s)`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            )}
            
            {clientInfo.budget && (
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <AttachMoney sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={formatCurrency(clientInfo.budget)}
                  secondary="Orçamento máximo"
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            )}
            
            {clientInfo.dates && (
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Home sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={formatDates(clientInfo.dates)}
                  secondary="Datas de interesse"
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            )}
          </List>
        </Box>

        {/* Amenities Preferences */}
        {(clientInfo.preferences || preferences?.amenities) && (
          <Box>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Comodidades Preferidas
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(clientInfo.preferences || preferences?.amenities || []).map((amenity, index) => (
                <Chip
                  key={index}
                  label={amenity}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Communication Style */}
        {preferences?.communicationStyle && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Estilo de Comunicação
            </Typography>
            
            <Chip
              label={preferences.communicationStyle === 'formal' ? 'Formal' : 'Casual'}
              color={preferences.communicationStyle === 'formal' ? 'primary' : 'secondary'}
              variant="outlined"
              size="small"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}