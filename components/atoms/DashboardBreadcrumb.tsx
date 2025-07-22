'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumbs,
  Link,
  Typography,
  Box,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Home,
  Dashboard,
  People,
  Business,
  CalendarMonth,
  AttachMoney,
  Analytics,
  Settings,
  Help,
  Chat,
  Language,
} from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
}

interface DashboardBreadcrumbProps {
  items?: BreadcrumbItem[];
  maxItems?: number;
  showIcons?: boolean;
}

const PATH_MAPPINGS: Record<string, { label: string; icon: React.ReactNode }> = {
  '/dashboard': { label: 'Dashboard', icon: <Dashboard /> },
  '/dashboard/clients': { label: 'Clientes', icon: <People /> },
  '/dashboard/properties': { label: 'Propriedades', icon: <Business /> },
  '/dashboard/reservations': { label: 'Reservas', icon: <CalendarMonth /> },
  '/dashboard/financeiro': { label: 'Financeiro', icon: <AttachMoney /> },
  '/dashboard/financeiro/transacoes': { label: 'Transações', icon: <AttachMoney /> },
  '/dashboard/financeiro/relatorios': { label: 'Relatórios', icon: <Analytics /> },
  '/dashboard/financeiro/cobrancas': { label: 'Cobranças', icon: <AttachMoney /> },
  '/dashboard/analytics': { label: 'Analytics', icon: <Analytics /> },
  '/dashboard/settings': { label: 'Configurações', icon: <Settings /> },
  '/dashboard/help': { label: 'Ajuda', icon: <Help /> },
  '/dashboard/conversations': { label: 'Conversas', icon: <Chat /> },
  '/dashboard/crm': { label: 'CRM', icon: <People /> },
  '/dashboard/financeiro-simples': { label: 'Financeiro Simples', icon: <AttachMoney /> },
  '/dashboard/profile': { label: 'Perfil', icon: <People /> },
};

export default function DashboardBreadcrumb({
  items,
  maxItems = 3,
  showIcons = true,
}: DashboardBreadcrumbProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();

  const generateBreadcrumbsFromPath = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with home
    breadcrumbs.push({
      label: 'Home',
      href: '/dashboard',
      icon: <Home />,
    });

    // Build path incrementally
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      const mapping = PATH_MAPPINGS[currentPath];
      if (mapping) {
        const isLast = index === pathSegments.length - 1;
        breadcrumbs.push({
          label: mapping.label,
          href: isLast ? undefined : currentPath,
          icon: mapping.icon,
          active: isLast,
        });
      } else {
        // Handle dynamic routes (like /dashboard/clients/123)
        const parentPath = pathSegments.slice(0, index + 1).join('/');
        const parentMapping = PATH_MAPPINGS[`/${pathSegments.slice(0, index + 1).join('/')}`];
        
        if (parentMapping) {
          breadcrumbs.push({
            label: segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Unknown',
            href: undefined,
            icon: parentMapping.icon,
            active: true,
          });
        }
      }
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbsFromPath();

  // Truncate if too many items
  const displayItems = breadcrumbItems.length > maxItems
    ? [
        breadcrumbItems[0],
        { label: '...', href: undefined },
        ...breadcrumbItems.slice(-maxItems + 1),
      ]
    : breadcrumbItems;

  if (isMobile) {
    // Mobile: Show only current page with back button
    const currentItem = breadcrumbItems[breadcrumbItems.length - 1];
    return (
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {showIcons && currentItem.icon}
          <Typography variant="h6" fontWeight={600}>
            {currentItem.label}
          </Typography>
          {currentItem.active && (
            <Chip label="Atual" size="small" color="primary" />
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        separator="›"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary',
            fontSize: '1.2rem',
          },
        }}
      >
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          if (isEllipsis) {
            return (
              <Typography
                key={index}
                variant="body2"
                color="text.secondary"
                sx={{ cursor: 'default' }}
              >
                ...
              </Typography>
            );
          }

          if (isLast || item.active || !item.href) {
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {showIcons && item.icon}
                <Typography
                  variant="body2"
                  color={item.active ? 'primary.main' : 'text.primary'}
                  fontWeight={item.active ? 600 : 400}
                >
                  {item.label}
                </Typography>
                {item.active && (
                  <Chip
                    label="Atual"
                    size="small"
                    color="primary"
                    sx={{
                      ml: 1,
                      height: 20,
                      fontSize: '0.75rem',
                    }}
                  />
                )}
              </Box>
            );
          }

          return (
            <Link
              key={index}
              href={item.href}
              underline="hover"
              color="text.secondary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {showIcons && item.icon}
              <Typography variant="body2">
                {item.label}
              </Typography>
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}