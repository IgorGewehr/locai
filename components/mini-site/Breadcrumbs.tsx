'use client';

import React from 'react';
import {
  Box,
  Breadcrumbs as MuiBreadcrumbs,
  Typography,
  Link,
  useTheme,
  alpha,
  Container
} from '@mui/material';
import {
  Home,
  NavigateNext,
  Business,
  LocationCity
} from '@mui/icons-material';
import { MiniSiteConfig } from '@/lib/types/mini-site';
import NextLink from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  config: MiniSiteConfig;
}

export default function Breadcrumbs({ items, config }: BreadcrumbsProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        backgroundColor: alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        py: { xs: 1, sm: 1.5 },
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Container maxWidth="xl">
        <MuiBreadcrumbs
          separator={
            <NavigateNext 
              sx={{ 
                color: alpha(config.theme.primaryColor, 0.6),
                fontSize: 16,
              }} 
            />
          }
          sx={{
            fontSize: { xs: '0.875rem', sm: '1rem' },
            '& .MuiBreadcrumbs-ol': {
              flexWrap: 'wrap',
            },
          }}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isFirst = index === 0;
            
            if (isLast || item.current) {
              return (
                <Box
                  key={item.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: config.theme.primaryColor,
                    fontWeight: 600,
                    px: { xs: 1, sm: 1.5 },
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: alpha(config.theme.primaryColor, 0.1),
                    border: `1px solid ${alpha(config.theme.primaryColor, 0.2)}`,
                    maxWidth: { xs: '200px', sm: 'none' },
                  }}
                >
                  {item.icon && (
                    <Box
                      component="span"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: { xs: 16, sm: 18 },
                        color: config.theme.primaryColor,
                      }}
                    >
                      {item.icon}
                    </Box>
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      color: config.theme.primaryColor,
                      fontWeight: 600,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              );
            }

            return (
              <Link
                key={item.label}
                component={NextLink}
                href={item.href || '#'}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: alpha(config.theme.textColor, 0.7),
                  textDecoration: 'none',
                  px: { xs: 1, sm: 1.5 },
                  py: 0.5,
                  borderRadius: 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  maxWidth: { xs: '150px', sm: 'none' },
                  '&:hover': {
                    backgroundColor: alpha(config.theme.primaryColor, 0.05),
                    color: config.theme.primaryColor,
                    transform: { xs: 'none', sm: 'translateY(-1px)' },
                  },
                }}
              >
                {item.icon && (
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: { xs: 16, sm: 18 },
                      opacity: isFirst ? 1 : 0.7,
                    }}
                  >
                    {item.icon}
                  </Box>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.label}
                </Typography>
              </Link>
            );
          })}
        </MuiBreadcrumbs>
      </Container>
    </Box>
  );
}

// Helper function to create breadcrumb items
export const createBreadcrumbItems = {
  home: (config: MiniSiteConfig): BreadcrumbItem => ({
    label: config.contactInfo.businessName || 'Início',
    href: `/site/${config.tenantId}`,
    icon: <Home />,
  }),
  
  properties: (config: MiniSiteConfig): BreadcrumbItem => ({
    label: 'Propriedades',
    href: `/site/${config.tenantId}`,
    icon: <Business />,
  }),
  
  property: (propertyName: string, config: MiniSiteConfig, propertyId: string): BreadcrumbItem => ({
    label: propertyName,
    href: `/site/${config.tenantId}/property/${propertyId}`,
    icon: <LocationCity />,
    current: true,
  }),
  
  location: (locationName: string, config: MiniSiteConfig): BreadcrumbItem => ({
    label: locationName,
    href: `/site/${config.tenantId}?location=${encodeURIComponent(locationName)}`,
    icon: <LocationCity />,
  }),
};