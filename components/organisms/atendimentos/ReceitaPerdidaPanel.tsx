'use client';

/**
 * Receita Perdida — painel de receita em risco/perdida sobre os leads já
 * carregados na página de Atendimentos. Reusa o core puro `computeCrmInsightsFromLeads`
 * (mesma fonte de verdade da IA-analista e do endpoint de analytics).
 *
 * Honestidade: os números de RECEITA são estimativas (contagem × ticket médio
 * real) e são rotulados como "estimativa". Contagens, conversão, ticket médio e
 * motivo de perda são reais. Nada é fabricado.
 */
import { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import type { Lead } from '@/lib/types/crm';
import { computeCrmInsightsFromLeads } from '@/lib/analytics/crm-insights-core';

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

interface TileProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  tooltip?: string;
}

function Tile({ label, value, sub, color = '#f1f5f9', tooltip }: TileProps) {
  const content = (
    <Box
      sx={{
        flex: '1 1 0',
        minWidth: 150,
        px: 2,
        py: 1.5,
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.375rem', fontWeight: 700, color, mt: 0.25, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', mt: 0.25 }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
  return tooltip ? (
    <Tooltip title={tooltip} arrow placement="top">
      {content}
    </Tooltip>
  ) : (
    content
  );
}

export default function ReceitaPerdidaPanel({ leads, hideTitle = false }: { leads: Lead[]; hideTitle?: boolean }) {
  const ins = useMemo(() => computeCrmInsightsFromLeads(leads), [leads]);

  const ticket = ins.overview.averageTicket;
  const hotStuck = ins.hotLeadsNoFollowUp.count;
  const lost = ins.winLoss.lost;
  const hasTicket = ticket > 0;

  const atRisk = hasTicket ? hotStuck * ticket : 0;
  const lostRevenue = hasTicket ? lost * ticket : 0;
  const topLost = ins.winLoss.topLostReasons[0];

  // Nada relevante a mostrar ainda: evita um painel "vazio" no começo.
  if (ins.overview.totalLeads === 0) return null;

  const ticketNote = hasTicket
    ? `estimativa = ${hotStuck > 0 || lost > 0 ? 'contagem × ticket médio real' : 'ticket médio real'} (${brl(ticket)})`
    : 'ainda sem ticket médio (nenhum lead ganho no período) — só contagens reais';

  return (
    <Box sx={{ mb: 2.5, flexShrink: 0 }}>
      {!hideTitle && (
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Receita perdida
          </Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>
            últimos {ins.period.months} meses
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Tile
          label="Em risco agora"
          value={hasTicket ? `~${brl(atRisk)}` : '—'}
          sub={`${hotStuck} lead${hotStuck === 1 ? '' : 's'} quente${hotStuck === 1 ? '' : 's'} sem retorno`}
          color={hotStuck > 0 ? '#ef4444' : '#f1f5f9'}
          tooltip={`Leads quentes sem retorno há mais de ${ins.hotLeadsNoFollowUp.slaHours}h. Valor é ${ticketNote}.`}
        />
        <Tile
          label="Perdida no período"
          value={hasTicket ? `~${brl(lostRevenue)}` : '—'}
          sub={`${lost} lead${lost === 1 ? '' : 's'} perdido${lost === 1 ? '' : 's'} · win rate ${ins.winLoss.winRate.toFixed(0)}%`}
          color={lost > 0 ? '#f59e0b' : '#f1f5f9'}
          tooltip={`Leads marcados como perdidos. Valor é ${ticketNote}.`}
        />
        <Tile
          label="Conversão"
          value={`${ins.overview.conversionRate.toFixed(1)}%`}
          sub={`${ins.overview.wonLeads} de ${ins.overview.totalLeads} leads`}
          color="#10b981"
          tooltip="Taxa de conversão real (ganhos ÷ total de leads no período)."
        />
        <Tile
          label="Maior motivo de perda"
          value={topLost ? topLost.reason : '—'}
          sub={topLost ? `${topLost.count}x` : 'sem dados ainda'}
          tooltip="Motivo de perda mais frequente (campo lostReason dos leads)."
        />
      </Box>

      <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', mt: 0.75 }}>
        Valores de receita são estimativas baseadas no ticket médio real; contagens, conversão e motivo de perda são dados reais.
      </Typography>
    </Box>
  );
}
