'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  Home,
  CalendarMonth,
  People,
  Chat,
  AccountBalance,
  Settings,
  HelpOutline,
  Event,
  Inbox,
  ChevronRight,
  Close,
} from '@mui/icons-material';

export const SIDEBAR_EXPANDED = 260;
export const SIDEBAR_COLLAPSED = 68;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'principal',
    title: 'PRINCIPAL',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <Dashboard sx={{ fontSize: 18 }} /> },
      { id: 'properties', label: 'Propriedades', href: '/dashboard/properties', icon: <Home sx={{ fontSize: 18 }} /> },
      { id: 'reservations', label: 'Reservas', href: '/dashboard/reservations', icon: <CalendarMonth sx={{ fontSize: 18 }} /> },
      { id: 'agenda', label: 'Agenda', href: '/dashboard/agenda', icon: <Event sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    key: 'gestao',
    title: 'GESTÃO',
    items: [
      { id: 'atendimentos', label: 'Atendimentos', href: '/dashboard/atendimentos', icon: <Inbox sx={{ fontSize: 18 }} /> },
      { id: 'clients', label: 'Clientes', href: '/dashboard/clients', icon: <People sx={{ fontSize: 18 }} /> },
      { id: 'conversas', label: 'Conversas', href: '/dashboard/conversas', icon: <Chat sx={{ fontSize: 18 }} /> },
      { id: 'financeiro', label: 'Financeiro', href: '/dashboard/financeiro', icon: <AccountBalance sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    key: 'sistema',
    title: 'SISTEMA',
    items: [
      { id: 'settings', label: 'Configurações', href: '/dashboard/settings', icon: <Settings sx={{ fontSize: 18 }} /> },
      { id: 'help', label: 'Ajuda', href: '/dashboard/help', icon: <HelpOutline sx={{ fontSize: 18 }} /> },
    ],
  },
];

function NavButton({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const [ripple, setRipple] = useState(false);

  const handleClick = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 500);
    onClick?.();
  };

  const btn = (
    <Box
      component={Link}
      href={item.href}
      onClick={handleClick}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: '100%',
        minHeight: 40,
        px: collapsed ? 0 : 1.5,
        borderRadius: '10px',
        textDecoration: 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
        transition: 'color 0.15s ease',
        '&:hover': {
          color: isActive ? 'white' : 'rgba(255,255,255,0.85)',
        },
        '&:hover .nav-hover-bg': {
          opacity: isActive ? 0 : 1,
        },
      }}
    >
      {/* Hover background */}
      <Box
        className="nav-hover-bg"
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '10px',
          bgcolor: 'rgba(255,255,255,0.05)',
          opacity: 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Active pill — shared layout animation */}
      {isActive && (
        <motion.span
          layoutId="nav-active-pill"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
            zIndex: 0,
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        />
      )}

      {/* Click ripple */}
      <AnimatePresence>
        {ripple && (
          <motion.span
            initial={{ opacity: 0.3, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2.2 }}
            exit={{}}
            transition={{ duration: 0.45, ease: [0.2, 0, 0.3, 1] }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 10,
              background: 'rgba(220,38,38,0.25)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'inherit',
          transition: 'transform 0.15s ease',
          '.nav-btn:hover &': {
            transform: 'scale(1.08)',
          },
        }}
      >
        {item.icon}
      </Box>

      {/* Label */}
      {!collapsed && (
        <Typography
          component="span"
          sx={{
            position: 'relative',
            zIndex: 2,
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.label}
        </Typography>
      )}

      {/* Tooltip arrow for collapsed state */}
      {collapsed && (
        <Box
          className="nav-tooltip"
          sx={{
            position: 'absolute',
            left: 'calc(100% + 12px)',
            top: '50%',
            transform: 'translateY(-50%) translateX(4px)',
            px: 1.5,
            py: 0.75,
            borderRadius: '8px',
            bgcolor: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
            zIndex: 9999,
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            '.MuiDrawer-paper:has(&:hover) &, &': { opacity: 0 },
          }}
        >
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
            {item.label}
          </Typography>
          {/* Arrow */}
          <Box sx={{
            position: 'absolute',
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: 5,
            borderStyle: 'solid',
            borderColor: 'transparent #1e293b transparent transparent',
          }} />
        </Box>
      )}
    </Box>
  );

  if (!collapsed) return btn;

  // CSS-only tooltip for collapsed mode (no extra DOM, no flicker)
  return (
    <Box
      sx={{
        position: 'relative',
        '&:hover .nav-collapsed-tooltip': {
          opacity: 1,
          transform: 'translateY(-50%) translateX(0)',
        },
      }}
    >
      {btn}
      <Box
        className="nav-collapsed-tooltip"
        sx={{
          position: 'absolute',
          left: 'calc(100% + 12px)',
          top: '50%',
          transform: 'translateY(-50%) translateX(4px)',
          px: 1.5,
          py: 0.75,
          borderRadius: '8px',
          bgcolor: '#1e293b',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
        }}
      >
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
          {item.label}
        </Typography>
        <Box sx={{
          position: 'absolute',
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderRight: '5px solid #1e293b',
        }} />
      </Box>
    </Box>
  );
}

function SidebarContent({
  isCollapsed,
  onToggleCollapse,
  isMobile,
  onClose,
  pathname,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const collapsed = isCollapsed && !isMobile;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    // Use the first two path segments as the base for matching (handles deep sub-pages)
    const base = '/' + href.split('/').filter(Boolean).slice(0, 2).join('/');
    return pathname === href || pathname.startsWith(base + '/') || pathname === base;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#0a0e17',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowX: 'hidden',
        overflowY: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 60,
          px: collapsed ? 0 : 2,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        {/* Logo + name (hidden when collapsed) */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <Box
              component={motion.a}
              href="/dashboard"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', minWidth: 0, flex: 1 }}
            >
              <Box
                component="img"
                src="/logo.jpg"
                alt="AlugaZap"
                sx={{ width: 30, height: 30, borderRadius: '8px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', lineHeight: 1.2, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  AlugaZap
                </Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap', mt: 0.25 }}>
                  Gestão Imobiliária
                </Typography>
              </Box>
            </Box>
          )}
        </AnimatePresence>

        {/* Prominent collapse / expand toggle */}
        <Box
          component={motion.button}
          onClick={isMobile ? onClose : onToggleCollapse}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          sx={{
            width: 32, height: 32, borderRadius: '50%', p: 0, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', color: '#fff',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            boxShadow: '0 3px 12px rgba(220,38,38,0.45)',
          }}
        >
          {isMobile ? (
            <Close sx={{ fontSize: 17 }} />
          ) : (
            <Box
              component={motion.span}
              animate={{ rotate: collapsed ? 0 : 180 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              sx={{ display: 'flex' }}
            >
              <ChevronRight sx={{ fontSize: 18 }} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1.5,
          px: collapsed ? 0.75 : 1.5,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {NAV_SECTIONS.map((section, sIdx) => (
          <Box key={section.key} sx={{ mb: sIdx < NAV_SECTIONS.length - 1 ? 2 : 0 }}>
            {/* Section header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: collapsed ? 0 : 1,
                mb: 0.5,
                height: 24,
              }}
            >
              {!collapsed && (
                <Typography
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {section.title}
                </Typography>
              )}
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  background: collapsed
                    ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)'
                    : 'linear-gradient(to right, rgba(255,255,255,0.1), transparent)',
                }}
              />
            </Box>

            {/* Items */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {section.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={collapsed}
                  onClick={isMobile ? onClose : undefined}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function Sidebar({ open, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const pathname = usePathname();

  const content = (
    <SidebarContent
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isMobile={isMobile}
      onClose={onClose}
      pathname={pathname}
    />
  );

  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={onClose}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                zIndex: theme.zIndex.drawer,
              }}
            />
          )}
        </AnimatePresence>

        {/* Drawer */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="drawer"
              initial={{ x: -SIDEBAR_EXPANDED, opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -SIDEBAR_EXPANDED, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: theme.zIndex.drawer + 1,
              }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop: permanent sidebar
  return (
    <Box
      sx={{
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: { xs: 'none', lg: 'block' },
        width: isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {content}
    </Box>
  );
}
