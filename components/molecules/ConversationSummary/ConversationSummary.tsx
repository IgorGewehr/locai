import React from 'react'
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  List, 
  ListItem, 
  ListItemText,
  Divider
} from '@mui/material'
import { 
  Person, 
  Topic, 
  TrendingUp, 
  Assignment,
  Schedule
} from '@mui/icons-material'
import { ConversationSummary as ConversationSummaryType } from '@/lib/types/conversation'
import ConversationStatus from '../../atoms/ConversationStatus/ConversationStatus'
import AIConfidenceIndicator from '../../atoms/AIConfidenceIndicator/AIConfidenceIndicator'

interface ConversationSummaryProps {
  summary: ConversationSummaryType
  clientName?: string
  confidence?: number
  lastMessageAt: Date
  duration?: number
}

export default function ConversationSummary({
  summary,
  clientName,
  confidence,
  lastMessageAt,
  duration
}: ConversationSummaryProps) {
  const formatDuration = (duration?: number) => {
    if (!duration) return 'Em andamento'
    
    const minutes = Math.floor(duration / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const formatLastMessage = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d atrás`
    if (hours > 0) return `${hours}h atrás`
    if (minutes > 0) return `${minutes}m atrás`
    return 'Agora'
  }

  const getSentimentColor = (label: string) => {
    switch (label) {
      case 'positive': return 'success'
      case 'negative': return 'error'
      default: return 'default'
    }
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="h6">
                {clientName || summary.clientName || 'Cliente'}
              </Typography>
            </Box>
            <ConversationStatus status={summary.stage as any} />
          </Box>
          
          {confidence !== undefined && (
            <AIConfidenceIndicator 
              confidence={confidence} 
              size="small"
              showIcon={false}
            />
          )}
        </Box>

        {/* Main Topic */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Topic sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="body1" fontWeight="medium">
            {summary.mainTopic}
          </Typography>
        </Box>

        {/* Key Points */}
        {summary.keyPoints.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Pontos Principais:
            </Typography>
            <List dense>
              {summary.keyPoints.slice(0, 3).map((point, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemText 
                    primary={`• ${point}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Sentiment */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrendingUp sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Sentimento:
          </Typography>
          <Chip
            label={summary.sentimentOverall.label}
            color={getSentimentColor(summary.sentimentOverall.label) as any}
            size="small"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary">
            ({Math.round(summary.sentimentOverall.confidence * 100)}% confiança)
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Next Steps */}
        {summary.nextSteps.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Assignment sx={{ fontSize: 20, color: 'info.main' }} />
              <Typography variant="subtitle2">
                Próximos Passos:
              </Typography>
            </Box>
            <List dense>
              {summary.nextSteps.slice(0, 2).map((step, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemText 
                    primary={`${index + 1}. ${step}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Outcome */}
        {summary.outcome && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Resultado:</strong> {summary.outcome}
            </Typography>
          </Box>
        )}

        {/* Timeline Info */}
        <Box sx={{ display: 'flex', justifyContent: 'between', gap: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Última mensagem: {formatLastMessage(lastMessageAt)}
            </Typography>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Duração: {formatDuration(duration)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}