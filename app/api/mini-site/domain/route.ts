/**
 * Custom Domain Management API
 * Handles custom domain configuration and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

interface DomainValidation {
  domain: string;
  isValid: boolean;
  status: 'pending' | 'active' | 'failed' | 'inactive';
  dnsRecords: {
    type: 'CNAME' | 'A';
    name: string;
    value: string;
    status: 'pending' | 'verified';
  }[];
  sslStatus: 'pending' | 'active' | 'failed';
  lastChecked: Date;
}

interface DomainSuggestion {
  domain: string;
  available: boolean;
  price?: number;
  registrar?: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, domain } = await request.json();
    
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const tenantId = auth.tenantId;

    switch (action) {
      case 'validate':
        const validation = await validateCustomDomain(domain);
        return NextResponse.json({ validation });

      case 'configure':
        const configuration = await configureCustomDomain(tenantId, domain);
        return NextResponse.json({ configuration });

      case 'verify':
        const verification = await verifyDomainSetup(domain);
        return NextResponse.json({ verification });

      case 'suggest':
        const suggestions = await suggestDomains(domain);
        return NextResponse.json({ suggestions });

      case 'remove':
        await removeCustomDomain(tenantId);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Custom domain API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const tenantId = auth.tenantId;
    const services = new TenantServiceFactory(tenantId);
    const settings = await services.settings.getSettings(tenantId);
    
    const customDomain = settings?.miniSite?.customDomain;
    
    if (!customDomain) {
      return NextResponse.json({ 
        hasCustomDomain: false,
        defaultUrl: `${process.env.NEXT_PUBLIC_APP_URL}/site/${tenantId}`,
        slug: generateSlug(settings?.company?.name || 'minha-imobiliaria'),
        availableUrls: generateAvailableUrls(tenantId, settings?.company?.name)
      });
    }

    const domainStatus = await checkDomainStatus(customDomain);
    
    return NextResponse.json({
      hasCustomDomain: true,
      customDomain,
      domainStatus,
      defaultUrl: `${process.env.NEXT_PUBLIC_APP_URL}/site/${tenantId}`,
    });

  } catch (error) {
    console.error('Domain status fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domain status' },
      { status: 500 }
    );
  }
}

async function validateCustomDomain(domain: string): Promise<DomainValidation> {
  // Basic domain validation
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  const isValid = domainRegex.test(domain);

  if (!isValid) {
    return {
      domain,
      isValid: false,
      status: 'failed',
      dnsRecords: [],
      sslStatus: 'failed',
      lastChecked: new Date(),
    };
  }

  // Check if domain already exists
  const existingDomain = await checkDomainExists(domain);
  
  return {
    domain,
    isValid: true,
    status: existingDomain ? 'failed' : 'pending',
    dnsRecords: [
      {
        type: 'CNAME',
        name: domain,
        value: `${process.env.NEXT_PUBLIC_APP_URL}`,
        status: 'pending',
      },
    ],
    sslStatus: 'pending',
    lastChecked: new Date(),
  };
}

async function configureCustomDomain(tenantId: string, domain: string): Promise<DomainValidation> {
  try {
    // Save domain to settings
    const services = new TenantServiceFactory(tenantId);
    await services.settings.updateMiniSiteSettings(tenantId, {
      customDomain: domain,
    });

    // Create DNS records configuration
    const dnsRecords = [
      {
        type: 'CNAME' as const,
        name: domain,
        value: `${process.env.NEXT_PUBLIC_APP_URL}`,
        status: 'pending' as const,
      },
    ];

    // In a real implementation, you would:
    // 1. Configure DNS records with your DNS provider
    // 2. Set up SSL certificate
    // 3. Update reverse proxy configuration

    return {
      domain,
      isValid: true,
      status: 'pending',
      dnsRecords,
      sslStatus: 'pending',
      lastChecked: new Date(),
    };
  } catch (error) {
    console.error('Domain configuration error:', error);
    throw error;
  }
}

async function verifyDomainSetup(domain: string): Promise<DomainValidation> {
  try {
    // Simulate DNS verification
    // In real implementation, you would check DNS records
    const dnsVerified = Math.random() > 0.3; // 70% success rate for demo
    
    return {
      domain,
      isValid: true,
      status: dnsVerified ? 'active' : 'pending',
      dnsRecords: [
        {
          type: 'CNAME',
          name: domain,
          value: `${process.env.NEXT_PUBLIC_APP_URL}`,
          status: dnsVerified ? 'verified' : 'pending',
        },
      ],
      sslStatus: dnsVerified ? 'active' : 'pending',
      lastChecked: new Date(),
    };
  } catch (error) {
    console.error('Domain verification error:', error);
    return {
      domain,
      isValid: false,
      status: 'failed',
      dnsRecords: [],
      sslStatus: 'failed',
      lastChecked: new Date(),
    };
  }
}

async function suggestDomains(baseDomain: string): Promise<DomainSuggestion[]> {
  const suggestions = [
    `${baseDomain}-imoveis.com.br`,
    `${baseDomain}-properties.com.br`,
    `${baseDomain}-realty.com.br`,
    `casas-${baseDomain}.com.br`,
    `imoveis-${baseDomain}.com.br`,
    `${baseDomain}-homes.com.br`,
  ];

  return suggestions.map(domain => ({
    domain,
    available: Math.random() > 0.4, // 60% availability for demo
    price: Math.floor(Math.random() * 50) + 30,
    registrar: ['Registro.br', 'GoDaddy', 'Namecheap'][Math.floor(Math.random() * 3)] as string,
  }));
}

async function checkDomainExists(domain: string): Promise<boolean> {
  // In real implementation, check against your domain database
  // or use a DNS lookup to verify if domain exists
  return false;
}

async function checkDomainStatus(domain: string): Promise<DomainValidation> {
  // In real implementation, check actual DNS records and SSL status
  return {
    domain,
    isValid: true,
    status: 'active',
    dnsRecords: [
      {
        type: 'CNAME',
        name: domain,
        value: `${process.env.NEXT_PUBLIC_APP_URL}`,
        status: 'verified',
      },
    ],
    sslStatus: 'active',
    lastChecked: new Date(),
  };
}

async function removeCustomDomain(tenantId: string): Promise<void> {
  const services = new TenantServiceFactory(tenantId);
  await services.settings.updateMiniSiteSettings(tenantId, {
    customDomain: '',
  });
}

function generateSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateAvailableUrls(tenantId: string, companyName?: string): string[] {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const slug = generateSlug(companyName || 'minha-imobiliaria');
  
  return [
    `${baseUrl}/site/${tenantId}`,
    `${baseUrl}/imoveis/${slug}`,
    `${baseUrl}/properties/${slug}`,
    `${baseUrl}/casas/${slug}`,
    `${baseUrl}/realty/${slug}`,
  ];
}