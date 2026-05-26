'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Box, Typography, InputBase, IconButton, CircularProgress, alpha } from '@mui/material';
import {
  AutoAwesome, ArrowUpward, LockOutlined, KeyboardCommandKey, InsertChartOutlined,
  Inbox, Chat, People, Home, CalendarMonth, Event, AccountBalanceWallet, Settings,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import { toDate } from '@/lib/utils/date-helpers';

const MODULES = [
  { label: 'Atendimentos', href: '/dashboard/atendimentos', icon: Inbox, color: '#ef4444' },
  { label: 'Conversas', href: '/dashboard/conversas', icon: Chat, color: '#ec4899' },
  { label: 'Clientes', href: '/dashboard/clients', icon: People, color: '#f43f5e' },
  { label: 'Propriedades', href: '/dashboard/properties', icon: Home, color: '#f59e0b' },
  { label: 'Reservas', href: '/dashboard/reservations', icon: CalendarMonth, color: '#10b981' },
  { label: 'Agenda', href: '/dashboard/agenda', icon: Event, color: '#14b8a6' },
  { label: 'Financeiro', href: '/dashboard/financeiro', icon: AccountBalanceWallet, color: '#0ea5e9' },
  { label: 'Configurações', href: '/dashboard/settings', icon: Settings, color: '#94a3b8' },
];

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

// Lightweight inline markdown: renders **bold** (line breaks handled by pre-wrap).
function renderRich(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part)
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

function StatTile({ label, value, subtitle, color, icon }: { label: string; value: string | number; subtitle: string; color: string; icon: React.ReactNode }) {
  return (
    <Box
      sx={{
        position: 'relative', bgcolor: '#0f1525', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px', p: { xs: 2.5, xl: 3 }, overflow: 'hidden', minWidth: 0,
        transition: 'border-color 0.2s ease, transform 0.2s ease',
        '&:hover': { borderColor: 'rgba(255,255,255,0.14)', transform: 'translateY(-2px)' },
        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1.5, xl: 2 } }}>
        <Box sx={{ width: { xs: 28, xl: 34 }, height: { xs: 28, xl: 34 }, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(color, 0.14), color }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: { xs: '0.6875rem', xl: '0.8125rem' }, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: { xs: '2rem', xl: '2.5rem' }, fontWeight: 700, color: '#f1f5f9', lineHeight: 1, letterSpacing: '-0.03em', mb: 0.75 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: { xs: '0.8125rem', xl: '0.9375rem' }, color: 'rgba(255,255,255,0.4)' }}>{subtitle}</Typography>
    </Box>
  );
}

export default function DashboardPage() {
  const { user, getFirebaseToken } = useAuth();
  const { services, tenantId, isReady } = useTenant();

  const [stats, setStats] = useState({
    activeConversations: 0, messagesToday: 0, leadsThisMonth: 0, needsYou: 0,
    visitsToday: 0, monthResult: 0, pendingTx: 0,
  });

  const [mode, setMode] = useState<'operador' | 'analista'>('operador');
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const firstName = (user as any)?.name?.split(' ')[0] || (user as any)?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

  const fetchStats = useCallback(async () => {
    if (!services || !tenantId || !isReady) return;
    try {
      const leads = await services.leads.getAll(500);
      const nowD = new Date();
      const leadsThisMonth = leads.filter((l: any) => {
        const d = toDate(l.createdAt);
        return d && d.getMonth() === nowD.getMonth() && d.getFullYear() === nowD.getFullYear();
      }).length;
      const needsYou = leads.filter((l: any) => l.escalation?.active).length;

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const msgsSnap = await getDocs(query(collection(db, `tenants/${tenantId}/messages`), where('timestamp', '>=', Timestamp.fromDate(today))));
      const convSnap = await getDocs(query(collection(db, `tenants/${tenantId}/conversations`), where('status', '==', 'active')));

      let visitsToday = 0;
      try {
        const visits = await services.visits.getAll(500);
        const todayStr = new Date().toDateString();
        visitsToday = visits.filter((v: any) => {
          const d = toDate(v.date || v.scheduledAt || v.startTime);
          return d && d.toDateString() === todayStr;
        }).length;
      } catch { /* visits optional */ }

      let monthResult = 0, pendingTx = 0;
      try {
        const txs = await services.transactions.getAll(1000);
        txs.forEach((t: any) => {
          const d = toDate(t.date || t.createdAt);
          const inMonth = d && d.getMonth() === nowD.getMonth() && d.getFullYear() === nowD.getFullYear();
          if (inMonth && (t.status === 'paid' || t.status === 'completed')) {
            monthResult += (t.type === 'income' ? 1 : -1) * (t.amount || 0);
          }
          if (t.status === 'pending' || t.status === 'overdue') pendingTx++;
        });
      } catch { /* transactions optional */ }

      setStats({
        activeConversations: convSnap.size, messagesToday: msgsSnap.size,
        leadsThisMonth, needsYou, visitsToday, monthResult, pendingTx,
      });
    } catch (e) {
      logger.error('[Dashboard] fetchStats failed', e instanceof Error ? e : undefined);
    }
  }, [services, tenantId, isReady]);

  useEffect(() => { if (isReady && tenantId) fetchStats(); }, [isReady, tenantId, fetchStats]);

  const sendConsole = useCallback(async () => {
    const message = input.trim();
    if (!message || sending) return;
    setSending(true);
    setChat((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    try {
      const token = await getFirebaseToken();
      const res = await fetch('/api/agent/console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, mode }),
      });
      const data = await res.json();
      setChat((prev) => [...prev, { role: 'assistant', content: data.reply || 'Sem resposta do agente.' }]);
    } catch {
      setChat((prev) => [...prev, { role: 'assistant', content: 'Não consegui falar com o agente agora.' }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, mode, getFirebaseToken]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [chat, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendConsole(); }
  };

  return (
    <Box sx={{ maxWidth: { xs: 1080, xl: 1320 }, mx: 'auto', pt: { xs: 1, md: 2, xl: 4 }, pb: 2 }}>
      {/* Greeting */}
      <Box sx={{ textAlign: 'center', mb: { xs: 2.5, xl: 4 } }}>
        <Typography sx={{ fontSize: { xs: '1.75rem', md: '2.25rem', xl: '3rem' }, fontWeight: 700, letterSpacing: '-0.03em', color: '#f1f5f9', lineHeight: 1.1 }}>
          {greetingFor(now)},{' '}
          <Box component="span" sx={{ background: 'linear-gradient(135deg, #f87171, #dc2626)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {firstName}
          </Box>
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.9375rem', md: '1.0625rem', xl: '1.25rem' }, color: 'rgba(255,255,255,0.45)', mt: 0.5 }}>
          {weekdayCap}, <Box component="span" sx={{ color: '#f87171', fontWeight: 600 }}>{now.getDate()}</Box> de {monthName}
        </Typography>
      </Box>

      {/* Mode toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.75 }}>
        <Box sx={{ display: 'inline-flex', p: 0.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', gap: 0.5 }}>
          {([['operador', 'Operador', KeyboardCommandKey], ['analista', 'Analista', InsertChartOutlined]] as const).map(([key, label, Icon]) => {
            const active = mode === key;
            return (
              <Box key={key} component="button" onClick={() => setMode(key)}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 2, py: 0.875, borderRadius: '9px',
                  border: 'none', cursor: 'pointer', outline: 'none', transition: 'all 0.15s ease',
                  bgcolor: active ? '#dc2626' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                  '&:hover': { color: active ? '#fff' : 'rgba(255,255,255,0.85)' },
                }}>
                <Icon sx={{ fontSize: { xs: 16, xl: 20 } }} />
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* AI console */}
      <Box
        sx={{
          display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1, pl: 2,
          borderRadius: '16px', border: '1px solid rgba(220,38,38,0.3)',
          bgcolor: 'rgba(255,255,255,0.03)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '&:focus-within': { borderColor: 'rgba(220,38,38,0.6)', boxShadow: '0 0 0 4px rgba(220,38,38,0.08)' },
        }}
      >
        <AutoAwesome sx={{ fontSize: { xs: 22, xl: 26 }, color: '#f87171', mt: 1.25, flexShrink: 0 }} />
        <InputBase
          inputRef={inputRef}
          fullWidth multiline maxRows={6}
          placeholder="Pergunte, comande ou execute uma ação..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          sx={{ flex: 1, fontSize: { xs: '1rem', xl: '1.125rem' }, color: '#f1f5f9', py: { xs: 1, xl: 1.5 }, '& textarea::placeholder, & input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 } }}
        />
        <IconButton
          onClick={sendConsole}
          disabled={!input.trim() || sending}
          sx={{
            width: { xs: 44, xl: 52 }, height: { xs: 44, xl: 52 }, flexShrink: 0, borderRadius: '12px',
            bgcolor: input.trim() ? '#dc2626' : 'rgba(255,255,255,0.06)',
            color: input.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
            '&:hover': { bgcolor: input.trim() ? '#b91c1c' : 'rgba(255,255,255,0.08)' },
          }}
        >
          {sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <ArrowUpward sx={{ fontSize: 20 }} />}
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255,255,255,0.4)' }}>
          <LockOutlined sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: '0.75rem' }}>
            {mode === 'operador' ? 'Confirma escritas' : 'Somente leitura'}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Enter envia · Shift+Enter quebra linha</Typography>
      </Box>

      {/* Console chat thread */}
      {chat.length > 0 && (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: '14px', bgcolor: '#0f1525', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {chat.map((m, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Box sx={{
                maxWidth: '82%', px: 1.75, py: 1.125, fontSize: '0.9375rem', lineHeight: 1.55, whiteSpace: 'pre-wrap',
                borderRadius: '16px',
                borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '16px',
                bgcolor: m.role === 'user' ? '#dc2626' : 'rgba(255,255,255,0.06)',
                color: m.role === 'user' ? '#fff' : 'rgba(255,255,255,0.9)',
              }}>
                {m.role === 'assistant' ? renderRich(m.content) : m.content}
              </Box>
            </Box>
          ))}
          {sending && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Box sx={{ px: 2, py: 1.25, borderRadius: '16px', borderBottomLeftRadius: '4px', bgcolor: 'rgba(255,255,255,0.06)' }}>
                <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.5)' }} />
              </Box>
            </Box>
          )}
          <div ref={chatEndRef} />
        </Box>
      )}

      {/* Module shortcuts */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 2, md: 3, xl: 4.5 }, flexWrap: 'wrap', mt: { xs: 3.5, xl: 5 }, mb: { xs: 3.5, xl: 5 } }}>
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Box key={m.href} component={Link} href={m.href}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textDecoration: 'none', width: { xs: 72, xl: 92 } }}>
              <Box sx={{
                width: { xs: 52, xl: 64 }, height: { xs: 52, xl: 64 }, borderRadius: { xs: '15px', xl: '18px' }, display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(m.color, 0.12), border: `1px solid ${alpha(m.color, 0.2)}`,
                transition: 'all 0.18s ease',
                '&:hover': { transform: 'translateY(-3px)', bgcolor: alpha(m.color, 0.2), borderColor: alpha(m.color, 0.45) },
              }}>
                <Icon sx={{ fontSize: { xs: 24, xl: 30 }, color: m.color }} />
              </Box>
              <Typography sx={{ fontSize: { xs: '0.75rem', xl: '0.875rem' }, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{m.label}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* Stat tiles */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, xl: 3 } }}>
        <StatTile
          label="AGENDA HOJE" value={stats.visitsToday} color="#f59e0b" icon={<Event sx={{ fontSize: { xs: 16, xl: 20 } }} />}
          subtitle={stats.visitsToday === 0 ? 'Sem agendamentos' : stats.visitsToday === 1 ? '1 agendamento' : `${stats.visitsToday} agendamentos`}
        />
        <StatTile
          label="CONVERSAS" value={stats.activeConversations} color="#ec4899" icon={<Chat sx={{ fontSize: { xs: 16, xl: 20 } }} />}
          subtitle={stats.messagesToday === 0 ? 'Sem mensagens novas' : `${stats.messagesToday} mensagens hoje`}
        />
        <StatTile
          label="ATENDIMENTOS" value={stats.needsYou > 0 ? stats.needsYou : stats.leadsThisMonth} color="#ef4444" icon={<Inbox sx={{ fontSize: { xs: 16, xl: 20 } }} />}
          subtitle={stats.needsYou > 0 ? `${stats.needsYou} precisam de você` : `${stats.leadsThisMonth} leads no mês`}
        />
        <StatTile
          label="FINANCEIRO" value={brl(stats.monthResult)} color="#0ea5e9" icon={<AccountBalanceWallet sx={{ fontSize: { xs: 16, xl: 20 } }} />}
          subtitle={stats.pendingTx === 0 ? 'Tudo em dia' : `${stats.pendingTx} pendência(s)`}
        />
      </Box>
    </Box>
  );
}
