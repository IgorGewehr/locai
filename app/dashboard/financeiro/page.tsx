'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import { TrendingUp, TrendingDown, AccountBalanceWallet, Campaign, Insights, Add, ArrowForward } from '@mui/icons-material';
import { useTenantServices } from '@/lib/hooks/useTenantServices';
import { logger } from '@/lib/utils/logger';
import type { Transaction } from '@/lib/types';
import type { Lead } from '@/lib/types/crm';

// ===== Color tokens (match app aesthetic) =====
const PANEL = '#111827';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#f1f5f9';
const MUTED = 'rgba(255,255,255,0.5)';
const GREEN = '#10b981';
const RED = '#ef4444';
const SLATE = '#64748b';
const BRAND = '#dc2626';

// ===== Helpers =====
function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

function inCurrentMonth(value: any, now: Date): boolean {
  const d = toDate(value);
  if (!d) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function brl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

const CATEGORY_LABELS: Record<string, string> = {
  reservation: 'Reserva',
  rent: 'Aluguel',
  maintenance: 'Manutenção',
  cleaning: 'Limpeza',
  utilities: 'Utilidades',
  commission: 'Comissão',
  marketing: 'Marketing',
  refund: 'Reembolso',
  other: 'Outros',
};

// A transaction counts toward the books unless cancelled/refunded
function isActive(t: Transaction): boolean {
  const s = t.status as string;
  return s !== 'cancelled' && s !== 'refunded' && s !== 'failed';
}

// ===== Small components =====
function StatCard({
  label,
  value,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  hint?: string;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: '14px',
        p: 2.5,
        overflow: 'hidden',
      }}
    >
      {/* Thin accent bar */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: accent }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: MUTED }}>{label}</Typography>
        <Box sx={{ color: accent, display: 'flex' }}>{icon}</Box>
      </Box>
      <Typography sx={{ mt: 1.25, fontSize: '1.75rem', fontWeight: 700, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {value}
      </Typography>
      {hint && (
        <Typography sx={{ mt: 0.75, fontSize: '0.75rem', color: MUTED }}>{hint}</Typography>
      )}
    </Box>
  );
}

export default function FinanceiroOverviewPage() {
  const services = useTenantServices();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!services) return;
    try {
      setLoading(true);
      const [tx, lds] = await Promise.all([
        services.transactions.getAll(1000),
        services.leads.getAll(1000),
      ]);
      setTransactions(tx as Transaction[]);
      setLeads(lds as Lead[]);
    } catch (e) {
      logger.error('[Financeiro] Failed to load overview data', e instanceof Error ? e : undefined);
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const now = new Date();

    const monthTx = transactions.filter((t) => isActive(t) && inCurrentMonth(t.date, now));

    let receitas = 0;
    let despesas = 0;
    let marketingSpend = 0;
    let commissionIncome = 0;
    const expenseByCategory: Record<string, number> = {};

    for (const t of monthTx) {
      const amount = t.amount || 0;
      if (t.type === 'income') {
        receitas += amount;
        if (t.category === 'commission') commissionIncome += amount;
      } else {
        despesas += amount;
        const cat = (t.category as string) || 'other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amount;
        if (t.category === 'marketing') marketingSpend += amount;
      }
    }

    const resultado = receitas - despesas;

    // Leads created this month
    const leadsThisMonth = leads.filter((l) => inCurrentMonth(l.createdAt, now)).length;

    // Custo de aquisição = marketing spend / leads created
    const cac = leadsThisMonth > 0 && marketingSpend > 0 ? marketingSpend / leadsThisMonth : null;

    // ROI de aquisição = commission income / marketing spend
    const roi = marketingSpend > 0 ? commissionIncome / marketingSpend : null;

    const expenseBreakdown = Object.entries(expenseByCategory)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);

    const maxExpense = expenseBreakdown.reduce((m, e) => Math.max(m, e.value), 0);

    return {
      receitas,
      despesas,
      resultado,
      cac,
      roi,
      leadsThisMonth,
      marketingSpend,
      expenseBreakdown,
      maxExpense,
    };
  }, [transactions, leads]);

  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.3)' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: TEXT, letterSpacing: '-0.02em' }}>
            Financeiro
          </Typography>
          <Typography variant="body2" sx={{ color: MUTED, mt: 0.5, textTransform: 'capitalize' }}>
            Livro da imobiliária — {monthLabel}
          </Typography>
        </Box>

        <Box
          component="button"
          onClick={() => router.push('/dashboard/financeiro/transacoes')}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            px: 2, py: 1, borderRadius: '10px', cursor: 'pointer',
            border: 'none', outline: 'none',
            background: `linear-gradient(135deg, ${BRAND} 0%, #b91c1c 100%)`,
            color: '#fff', fontWeight: 600, fontSize: '0.875rem',
            boxShadow: '0 3px 12px rgba(220,38,38,0.35)',
            transition: 'filter 0.15s ease',
            '&:hover': { filter: 'brightness(1.08)' },
          }}
        >
          <Add sx={{ fontSize: 18 }} />
          Nova transação
        </Box>
      </Box>

      {/* Top StatCards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <StatCard
          label="Receitas do mês"
          value={brl(metrics.receitas)}
          icon={<TrendingUp sx={{ fontSize: 20 }} />}
          accent={GREEN}
        />
        <StatCard
          label="Despesas do mês"
          value={brl(metrics.despesas)}
          icon={<TrendingDown sx={{ fontSize: 20 }} />}
          accent={RED}
        />
        <StatCard
          label="Resultado do mês"
          value={brl(metrics.resultado)}
          icon={<AccountBalanceWallet sx={{ fontSize: 20 }} />}
          accent={metrics.resultado >= 0 ? GREEN : RED}
          hint={metrics.resultado >= 0 ? 'Lucro no período' : 'Prejuízo no período'}
        />
      </Box>

      {/* Acquisition metrics */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <StatCard
          label="Custo de aquisição"
          value={metrics.cac !== null ? `${brl(metrics.cac)} / lead` : '—'}
          icon={<Campaign sx={{ fontSize: 20 }} />}
          accent={SLATE}
          hint={
            metrics.leadsThisMonth > 0
              ? `${brl(metrics.marketingSpend)} em marketing · ${metrics.leadsThisMonth} ${metrics.leadsThisMonth === 1 ? 'lead' : 'leads'}`
              : 'Sem leads ou investimento de marketing no mês'
          }
        />
        <StatCard
          label="ROI de aquisição"
          value={metrics.roi !== null ? `${metrics.roi.toFixed(1)}x` : '—'}
          icon={<Insights sx={{ fontSize: 20 }} />}
          accent={metrics.roi !== null && metrics.roi >= 1 ? GREEN : SLATE}
          hint="Comissões ÷ investimento em marketing"
        />
      </Box>

      {/* Expense breakdown */}
      <Box
        sx={{
          bgcolor: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: '14px',
          p: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: TEXT }}>
            Despesas por categoria
          </Typography>
          <Box
            component="button"
            onClick={() => router.push('/dashboard/financeiro/transacoes')}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none',
              color: MUTED, fontSize: '0.8125rem', fontWeight: 600,
              transition: 'color 0.15s ease',
              '&:hover': { color: TEXT },
            }}
          >
            Ver transações
            <ArrowForward sx={{ fontSize: 15 }} />
          </Box>
        </Box>

        {metrics.expenseBreakdown.length === 0 ? (
          <Typography sx={{ color: MUTED, fontSize: '0.875rem', py: 2 }}>
            Nenhuma despesa registrada neste mês.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            {metrics.expenseBreakdown.map(({ category, value }) => {
              const pct = metrics.maxExpense > 0 ? (value / metrics.maxExpense) * 100 : 0;
              const share = metrics.despesas > 0 ? (value / metrics.despesas) * 100 : 0;
              return (
                <Box key={category}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.625 }}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                      {CATEGORY_LABELS[category] || category}
                      <Box component="span" sx={{ color: MUTED, fontWeight: 400, ml: 0.75 }}>
                        {share.toFixed(0)}%
                      </Box>
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: TEXT }}>
                      {brl(value)}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: '3px', bgcolor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: '3px',
                        background: `linear-gradient(90deg, #b91c1c 0%, ${RED} 100%)`,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
