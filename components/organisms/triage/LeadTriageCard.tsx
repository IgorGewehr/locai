'use client';

import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import type { Lead } from '@/lib/types/crm';
import { LeadStatus } from '@/lib/types/crm';
import { computeTriageStatus, TRIAGE_CONFIG, idleLabel } from '@/lib/utils/triage';

const STATUS_LABEL: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'Novo',
  [LeadStatus.CONTACTED]: 'Contatado',
  [LeadStatus.QUALIFIED]: 'Qualificado',
  [LeadStatus.OPPORTUNITY]: 'Oportunidade',
  [LeadStatus.NEGOTIATION]: 'Negociação',
  [LeadStatus.WON]: 'Ganho',
  [LeadStatus.LOST]: 'Perdido',
  [LeadStatus.NURTURING]: 'Nutrindo',
};

function formatValue(v?: number): string | null {
  if (!v || v <= 0) return null;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}k`;
  return `R$ ${v}`;
}

function contextLine(lead: Lead, status: ReturnType<typeof computeTriageStatus>): string {
  const idle = idleLabel(lead.lastContactDate);
  if (status === 'needs_you') return lead.escalation?.reason || 'Pediu atendimento humano';
  if (status === 'cooling') return `${STATUS_LABEL[lead.status]} · sem resposta ${idle}`;
  if (status === 'closing') {
    const prob = lead.aiInsights?.conversionProbability;
    return prob ? `Em negociação · ${Math.round(prob * 100)}% de chance` : 'Em negociação';
  }
  return idle ? `${STATUS_LABEL[lead.status]} · ${idle}` : STATUS_LABEL[lead.status];
}

interface LeadTriageCardProps {
  lead: Lead;
  index: number;
  onOpenConversation: (lead: Lead) => void;
  onAssume: (lead: Lead) => void;
}

export default function LeadTriageCard({ lead, index, onOpenConversation, onAssume }: LeadTriageCardProps) {
  const status = computeTriageStatus(lead);
  const cfg = TRIAGE_CONFIG[status];
  const value = formatValue(lead.budget || lead.wonValue || lead.aiInsights?.predictedValue);
  const name = lead.name || lead.clientName || lead.phone;
  const needsYou = status === 'needs_you';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.3) }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          bgcolor: '#111827',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'all 0.18s ease',
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.16)',
            transform: 'translateY(-1px)',
          },
        }}
      >
        {/* Accent bar */}
        <Box sx={{ width: 4, bgcolor: cfg.color, flexShrink: 0 }} />

        <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
          {/* Row 1: name + value */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5, mb: 0.75 }}>
            <Typography
              sx={{
                fontWeight: 600, fontSize: '0.9375rem', color: '#f1f5f9',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {name}
            </Typography>
            {value && (
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#e2e8f0', flexShrink: 0, letterSpacing: '-0.02em' }}>
                {value}
              </Typography>
            )}
          </Box>

          {/* Row 2: status dot + label */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875, mb: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cfg.label}
            </Typography>
          </Box>

          {/* Row 3: context */}
          <Typography
            sx={{
              fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', mb: 1.5,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontStyle: needsYou ? 'italic' : 'normal',
            }}
          >
            {needsYou ? `"${contextLine(lead, status)}"` : contextLine(lead, status)}
          </Typography>

          {/* Row 4: actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => onOpenConversation(lead)}
              sx={{
                fontSize: '0.75rem', fontWeight: 600, textTransform: 'none',
                color: '#818cf8', px: 1.25, minWidth: 0,
                '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' },
              }}
            >
              Abrir conversa
            </Button>
            {needsYou && (
              <Button
                size="small"
                variant="text"
                onClick={() => onAssume(lead)}
                sx={{
                  fontSize: '0.75rem', fontWeight: 600, textTransform: 'none',
                  color: cfg.color, px: 1.25, minWidth: 0,
                  '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' },
                }}
              >
                Assumir
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}
