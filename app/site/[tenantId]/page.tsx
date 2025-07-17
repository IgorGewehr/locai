'use client';

import React, { useEffect, useState } from 'react';
import { Box, Alert, Container } from '@mui/material';
import { useParams } from 'next/navigation';
import { MiniSiteConfig, PublicProperty } from '@/lib/types/mini-site';
import MiniSiteLayoutNew from '@/components/mini-site/MiniSiteLayoutNew';
import PropertyGridModern from '@/components/mini-site/PropertyGridModern';
import PropertyGridSkeleton from '@/components/mini-site/PropertyGridSkeleton';
import ErrorBoundary from '@/components/mini-site/ErrorBoundary';
import MiniSiteError from '@/components/mini-site/MiniSiteError';

export default function MiniSitePage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  
  const [config, setConfig] = useState<MiniSiteConfig | null>(null);
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMiniSiteData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use URLSearchParams to safely handle query parameters
        const searchParams = typeof window !== 'undefined' ? window.location.search : '';
        const response = await fetch(`/api/mini-site/${tenantId}${searchParams}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load mini-site');
        }

        if (data.success) {
          setConfig(data.data.config);
          setProperties(data.data.properties);

          // Update page metadata safely
          if (typeof window !== 'undefined' && data.data.config.seo) {
            document.title = data.data.config.seo.title;
            
            // Helper function to update or create meta tags
            const updateMetaTag = (selector: string, property: string, content: string) => {
              let meta = document.querySelector(selector);
              if (meta) {
                meta.setAttribute('content', content);
              } else {
                meta = document.createElement('meta');
                if (property.includes('property')) {
                  meta.setAttribute('property', property.replace('property=', ''));
                } else {
                  meta.setAttribute('name', property.replace('name=', ''));
                }
                meta.setAttribute('content', content);
                document.head.appendChild(meta);
              }
            };

            // Update meta tags
            updateMetaTag('meta[name="description"]', 'name=description', data.data.config.seo.description);
            updateMetaTag('meta[name="keywords"]', 'name=keywords', data.data.config.seo.keywords.join(', '));
            updateMetaTag('meta[property="og:title"]', 'property=og:title', data.data.config.seo.title);
            updateMetaTag('meta[property="og:description"]', 'property=og:description', data.data.config.seo.description);
            
            if (data.data.config.seo.ogImage) {
              updateMetaTag('meta[property="og:image"]', 'property=og:image', data.data.config.seo.ogImage);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching mini-site data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load mini-site');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchMiniSiteData();
    }
  }, [tenantId]);

  if (loading) {
    return <PropertyGridSkeleton />;
  }

  if (error) {
    const isNotFound = error === 'Mini-site not found or inactive' || error === 'Failed to load mini-site';
    return (
      <MiniSiteError 
        error={new Error(error)} 
        isNotFound={isNotFound}
        reset={() => {
          setError(null);
          setLoading(true);
          window.location.reload();
        }}
      />
    );
  }

  if (!config) {
    return (
      <MiniSiteError 
        error={new Error('Mini-site não encontrado ou inativo')} 
        isNotFound={true}
      />
    );
  }

  return (
    <ErrorBoundary>
      <MiniSiteLayoutNew config={config}>
        <PropertyGridModern properties={properties} config={config} />
      </MiniSiteLayoutNew>
    </ErrorBoundary>
  );
}