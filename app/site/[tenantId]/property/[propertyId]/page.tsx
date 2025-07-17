'use client';

import React, { useEffect, useState } from 'react';
import { Box, Alert, Container } from '@mui/material';
import { useParams } from 'next/navigation';
import { MiniSiteConfig, PublicProperty } from '@/lib/types/mini-site';
import MiniSiteLayoutNew from '@/components/mini-site/MiniSiteLayoutNew';
import PropertyDetailView from '@/components/mini-site/PropertyDetailView';
import PropertyDetailSkeleton from '@/components/mini-site/PropertyDetailSkeleton';
import ErrorBoundary from '@/components/mini-site/ErrorBoundary';
import Breadcrumbs, { createBreadcrumbItems } from '@/components/mini-site/Breadcrumbs';

export default function PropertyDetailPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const propertyId = params.propertyId as string;
  
  const [config, setConfig] = useState<MiniSiteConfig | null>(null);
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/mini-site/${tenantId}/properties/${propertyId}${window.location.search}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load property');
        }

        if (data.success) {
          setConfig(data.data.config);
          setProperty(data.data.property);

          // Update page metadata
          if (data.data.property && data.data.config.seo) {
            const propertyTitle = `${data.data.property.name} - ${data.data.config.seo.title}`;
            document.title = propertyTitle;
            
            // Update meta description
            const propertyDescription = data.data.property.description.substring(0, 160) + '...';
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
              metaDescription.setAttribute('content', propertyDescription);
            } else {
              const meta = document.createElement('meta');
              meta.name = 'description';
              meta.content = propertyDescription;
              document.head.appendChild(meta);
            }

            // Update OG tags
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) {
              ogTitle.setAttribute('content', propertyTitle);
            } else {
              const meta = document.createElement('meta');
              meta.setAttribute('property', 'og:title');
              meta.content = propertyTitle;
              document.head.appendChild(meta);
            }

            const ogDescription = document.querySelector('meta[property="og:description"]');
            if (ogDescription) {
              ogDescription.setAttribute('content', propertyDescription);
            } else {
              const meta = document.createElement('meta');
              meta.setAttribute('property', 'og:description');
              meta.content = propertyDescription;
              document.head.appendChild(meta);
            }

            // Set property image as OG image
            if (data.data.property.media.photos.length > 0) {
              const mainImage = data.data.property.media.photos.find(photo => photo.isMain) || data.data.property.media.photos[0];
              const ogImage = document.querySelector('meta[property="og:image"]');
              if (ogImage) {
                ogImage.setAttribute('content', mainImage.url);
              } else {
                const meta = document.createElement('meta');
                meta.setAttribute('property', 'og:image');
                meta.content = mainImage.url;
                document.head.appendChild(meta);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching property data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId && propertyId) {
      fetchPropertyData();
    }
  }, [tenantId, propertyId]);

  if (loading) {
    return <PropertyDetailSkeleton />;
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert 
          severity="error" 
          sx={{ 
            borderRadius: 3,
            '& .MuiAlert-message': {
              fontSize: '1.1rem',
            },
          }}
        >
          {error === 'Property not found' 
            ? 'Esta propriedade não foi encontrada ou não está disponível.'
            : error
          }
        </Alert>
      </Container>
    );
  }

  if (!config || !property) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert 
          severity="warning"
          sx={{ 
            borderRadius: 3,
            '& .MuiAlert-message': {
              fontSize: '1.1rem',
            },
          }}
        >
          Propriedade não encontrada.
        </Alert>
      </Container>
    );
  }

  const breadcrumbItems = [
    createBreadcrumbItems.home(config),
    createBreadcrumbItems.properties(config),
    createBreadcrumbItems.property(property.name, config, property.id),
  ];

  return (
    <ErrorBoundary>
      <MiniSiteLayoutNew config={config}>
        <Breadcrumbs items={breadcrumbItems} config={config} />
        <PropertyDetailView property={property} config={config} />
      </MiniSiteLayoutNew>
    </ErrorBoundary>
  );
}