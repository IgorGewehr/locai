'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, Collapse } from '@mui/material';
import { useTenantServices } from '@/lib/hooks/useTenantServices';
import { useAuth } from '@/lib/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import type { Lead } from '@/lib/types/crm';
import { computeTriageStatus, sortLeadsByUrgency, hoursSince } from '@/lib/utils/triage';
import { normalizeBrazilPhone } from '@/lib/services/lead-lookup';
import LeadTriageCard from '@/components/organisms/triage/LeadTriageCard';
import ReceitaPerdidaPanel from '@/components/organisms/atendimentos/ReceitaPerdidaPanel';

type FilterKey = 'all' | 'needs_you' | 'cooling' | 'closing' | 'hot' | 'today';

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all', label: 'Todos', color: '#94a3b8' },
  { key: 'needs_you', label: 'Precisam de você', color: '#ef4444' },
  { key: 'cooling', label: 'Esfriando', color: '#f59e0b' },
  { key: 'closing', label: 'Fechando', color: '#10b981' },
  { key: 'hot', label: 'Quentes', color: '#fb923c' },
  { key: 'today', label: 'Hoje', color: '#dc2626' },
];

function matchesFilter(lead: Lead, key: FilterKey): boolean {
  if (key === 'all') return true;
  if (key === 'hot') return lead.temperature === 'hot';
  if (key === 'today') return hoursSince(lead.lastContactDate) < 24;
  return computeTriageStatus(lead) === key;
}

export default function AtendimentosPage() {
  const services = useTenantServices();
  const { getFirebaseToken } = useAuth();
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  // Receita perdida is a 6-month / 24h-SLA view — secondary to the immediate-action
  // triage above, so it lives collapsed below the list and the operator opts in.
  const [showReceita, setShowReceita] = useState(false);

  const loadLeads = useCallback(async () => {
    if (!services) return;
    try {
      // Deterministic selection: order by updatedAt desc so the 300-doc window is
      // the 300 most-recently-touched leads (stable across loads) instead of an
      // arbitrary Firestore order. sortLeadsByUrgency still ranks them for display.
      let all: Lead[];
      try {
        all = await services.leads.getMany([], {
          orderBy: 'updatedAt',
          orderDirection: 'desc',
          limit: 300,
        });
      } catch {
        // Fallback if the ordered query fails (e.g. missing index / legacy docs).
        all = await services.leads.getAll(300);
      }
      setLeads(all);
    } catch (e) {
      logger.error('[Atendimentos] Failed to load leads', e instanceof Error ? e : undefined);
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    loadLeads();
    // Refresh every 5 min, only while the tab is visible — avoids runaway Firebase reads.
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadLeads();
    }, 300_000);
    return () => clearInterval(t);
  }, [loadLeads]);

  const ranked = useMemo(() => sortLeadsByUrgency(leads), [leads]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: leads.length, needs_you: 0, cooling: 0, closing: 0, hot: 0, today: 0 };
    for (const lead of leads) {
      (['needs_you', 'cooling', 'closing', 'hot', 'today'] as FilterKey[]).forEach((k) => {
        if (matchesFilter(lead, k)) c[k]++;
      });
    }
    return c;
  }, [leads]);

  const visible = useMemo(() => ranked.filter((l) => matchesFilter(l, filter)), [ranked, filter]);

  const openConversation = useCallback((lead: Lead) => {
    router.push(`/dashboard/conversas?phone=${encodeURIComponent(normalizeBrazilPhone(lead.phone))}`);
  }, [router]);

  const assume = useCallback(async (lead: Lead) => {
    try {
      const token = await getFirebaseToken();
      await fetch(`/api/crm/leads/${lead.id}/resolve-escalation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, escalation: { ...l.escalation!, active: false } } : l))
      );
    } catch (e) {
      logger.error('[Atendimentos] Failed to resolve escalation', e instanceof Error ? e : undefined);
    }
    openConversation(lead);
  }, [getFirebaseToken, openConversation]);

  return (
    <Box sx={{ height: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 96px)' }, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 2.5, flexShrink: 0 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}>
          Atendimentos
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
          {counts.needs_you > 0
            ? `${counts.needs_you} ${counts.needs_you === 1 ? 'cliente precisa' : 'clientes precisam'} de você agora`
            : 'A IA está cuidando de tudo — nenhuma intervenção pendente'}
        </Typography>
      </Box>

      {/* Filter chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap', flexShrink: 0 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key];
          return (
            <Box
              key={f.key}
              component="button"
              onClick={() => setFilter(f.key)}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                px: 1.5, py: 0.625, borderRadius: '20px', cursor: 'pointer',
                border: '1px solid',
                borderColor: active ? f.color : 'rgba(255,255,255,0.1)',
                bgcolor: active ? `${f.color}1f` : 'transparent',
                transition: 'all 0.15s ease',
                outline: 'none',
                '&:hover': { borderColor: f.color },
              }}
            >
              {f.key !== 'all' && f.key !== 'today' && (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: f.color }} />
              )}
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: active ? f.color : 'rgba(255,255,255,0.7)' }}>
                {f.label}
              </Typography>
              {count > 0 && (
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: active ? f.color : 'rgba(255,255,255,0.4)' }}>
                  {count}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* List — fills remaining space, scrolls internally */}
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, pr: 0.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.3)' }} />
          </Box>
        ) : visible.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
              Nenhum atendimento neste filtro.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr', xl: '1fr 1fr 1fr' }, gap: 1.5, alignContent: 'start' }}>
            {visible.map((lead, i) => (
              <LeadTriageCard
                key={lead.id}
                lead={lead}
                index={i}
                onOpenConversation={openConversation}
                onAssume={assume}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Receita perdida — horizonte de 6m / SLA 24h. Colapsável e abaixo da lista
          para não competir com a triagem de ação imediata ("Precisam de você"). */}
      {!loading && leads.length > 0 && (
        <Box sx={{ flexShrink: 0, mt: 2, borderTop: '1px solid rgba(255,255,255,0.06)', pt: 1.5 }}>
          <Box
            component="button"
            onClick={() => setShowReceita((v) => !v)}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              bgcolor: 'transparent', border: 'none', cursor: 'pointer', p: 0, outline: 'none',
            }}
          >
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Receita perdida
            </Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>
              {showReceita ? 'ocultar' : 'ver horizonte de receita'}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', transition: 'transform 0.15s ease', transform: showReceita ? 'rotate(180deg)' : 'none' }}>
              ▾
            </Typography>
          </Box>
          <Collapse in={showReceita} unmountOnExit>
            <Box sx={{ mt: 1.5 }}>
              <ReceitaPerdidaPanel leads={leads} hideTitle />
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
