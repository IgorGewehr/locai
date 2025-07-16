/**
 * Mini-Site Themes and Templates
 * Professional design system for mini-sites
 */

export interface MiniSiteTemplate {
  id: string;
  name: string;
  description: string;
  category: 'luxury' | 'modern' | 'classic' | 'minimalist' | 'tropical' | 'urban';
  preview: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    headingColor: string;
    linkColor: string;
    borderColor: string;
    shadowColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
    gradients: {
      primary: string;
      secondary: string;
      hero: string;
    };
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    bodyFont: string;
    sizes: {
      h1: string;
      h2: string;
      h3: string;
      body: string;
      small: string;
    };
    weights: {
      light: number;
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  layout: {
    containerWidth: string;
    borderRadius: string;
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    shadows: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  components: {
    hero: {
      style: 'minimal' | 'gradient' | 'image' | 'video';
      height: string;
      overlay: boolean;
    };
    propertyCard: {
      style: 'card' | 'list' | 'masonry' | 'carousel';
      showPricing: boolean;
      showBadges: boolean;
      hoverEffect: boolean;
    };
    navigation: {
      style: 'sticky' | 'fixed' | 'transparent' | 'minimal';
      showLogo: boolean;
      showSearch: boolean;
    };
    footer: {
      style: 'minimal' | 'detailed' | 'newsletter' | 'social';
      showContact: boolean;
      showSocial: boolean;
    };
  };
}

export const MINI_SITE_TEMPLATES: MiniSiteTemplate[] = [
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    description: 'Elegante e sofisticado, ideal para imóveis de alto padrão',
    category: 'luxury',
    preview: '/templates/luxury-gold.jpg',
    theme: {
      primaryColor: '#D4AF37',
      secondaryColor: '#1A1A1A',
      accentColor: '#B8860B',
      backgroundColor: '#FEFEFE',
      textColor: '#2D2D2D',
      headingColor: '#1A1A1A',
      linkColor: '#D4AF37',
      borderColor: '#E8E8E8',
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      successColor: '#4CAF50',
      warningColor: '#FF9800',
      errorColor: '#F44336',
      gradients: {
        primary: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
        secondary: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
        hero: 'linear-gradient(135deg, rgba(212, 175, 55, 0.9) 0%, rgba(184, 134, 11, 0.9) 100%)',
      },
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      headingFont: 'Playfair Display, serif',
      bodyFont: 'Inter, sans-serif',
      sizes: {
        h1: '3.5rem',
        h2: '2.5rem',
        h3: '1.875rem',
        body: '1rem',
        small: '0.875rem',
      },
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    layout: {
      containerWidth: '1200px',
      borderRadius: '12px',
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
      shadows: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.05)',
        md: '0 4px 16px rgba(0, 0, 0, 0.1)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.15)',
        xl: '0 16px 64px rgba(0, 0, 0, 0.2)',
      },
    },
    components: {
      hero: {
        style: 'gradient',
        height: '70vh',
        overlay: true,
      },
      propertyCard: {
        style: 'card',
        showPricing: true,
        showBadges: true,
        hoverEffect: true,
      },
      navigation: {
        style: 'transparent',
        showLogo: true,
        showSearch: true,
      },
      footer: {
        style: 'detailed',
        showContact: true,
        showSocial: true,
      },
    },
  },
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    description: 'Design moderno e limpo, perfeito para imobiliárias contemporâneas',
    category: 'modern',
    preview: '/templates/modern-blue.jpg',
    theme: {
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF',
      accentColor: '#3B82F6',
      backgroundColor: '#FFFFFF',
      textColor: '#374151',
      headingColor: '#1F2937',
      linkColor: '#2563EB',
      borderColor: '#E5E7EB',
      shadowColor: 'rgba(37, 99, 235, 0.1)',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      gradients: {
        primary: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
        secondary: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        hero: 'linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(30, 64, 175, 0.9) 100%)',
      },
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      headingFont: 'Inter, sans-serif',
      bodyFont: 'Inter, sans-serif',
      sizes: {
        h1: '3rem',
        h2: '2.25rem',
        h3: '1.75rem',
        body: '1rem',
        small: '0.875rem',
      },
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    layout: {
      containerWidth: '1140px',
      borderRadius: '8px',
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
      shadows: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
        md: '0 4px 12px rgba(0, 0, 0, 0.15)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
        xl: '0 16px 48px rgba(0, 0, 0, 0.25)',
      },
    },
    components: {
      hero: {
        style: 'image',
        height: '60vh',
        overlay: true,
      },
      propertyCard: {
        style: 'card',
        showPricing: true,
        showBadges: true,
        hoverEffect: true,
      },
      navigation: {
        style: 'sticky',
        showLogo: true,
        showSearch: true,
      },
      footer: {
        style: 'minimal',
        showContact: true,
        showSocial: false,
      },
    },
  },
  {
    id: 'tropical-green',
    name: 'Tropical Green',
    description: 'Inspirado na natureza, ideal para casas de praia e campo',
    category: 'tropical',
    preview: '/templates/tropical-green.jpg',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      accentColor: '#10B981',
      backgroundColor: '#F9FAFB',
      textColor: '#374151',
      headingColor: '#1F2937',
      linkColor: '#059669',
      borderColor: '#D1FAE5',
      shadowColor: 'rgba(5, 150, 105, 0.1)',
      successColor: '#059669',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      gradients: {
        primary: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        secondary: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        hero: 'linear-gradient(135deg, rgba(5, 150, 105, 0.8) 0%, rgba(4, 120, 87, 0.8) 100%)',
      },
    },
    typography: {
      fontFamily: 'Nunito, sans-serif',
      headingFont: 'Poppins, sans-serif',
      bodyFont: 'Nunito, sans-serif',
      sizes: {
        h1: '3.25rem',
        h2: '2.5rem',
        h3: '1.875rem',
        body: '1.125rem',
        small: '1rem',
      },
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    layout: {
      containerWidth: '1200px',
      borderRadius: '16px',
      spacing: {
        xs: '0.75rem',
        sm: '1.25rem',
        md: '2rem',
        lg: '2.5rem',
        xl: '3.5rem',
      },
      shadows: {
        sm: '0 2px 8px rgba(5, 150, 105, 0.08)',
        md: '0 4px 16px rgba(5, 150, 105, 0.12)',
        lg: '0 8px 32px rgba(5, 150, 105, 0.16)',
        xl: '0 16px 64px rgba(5, 150, 105, 0.2)',
      },
    },
    components: {
      hero: {
        style: 'video',
        height: '75vh',
        overlay: true,
      },
      propertyCard: {
        style: 'masonry',
        showPricing: true,
        showBadges: true,
        hoverEffect: true,
      },
      navigation: {
        style: 'fixed',
        showLogo: true,
        showSearch: true,
      },
      footer: {
        style: 'newsletter',
        showContact: true,
        showSocial: true,
      },
    },
  },
  {
    id: 'minimalist-gray',
    name: 'Minimalist Gray',
    description: 'Clean e minimalista, foco total nos imóveis',
    category: 'minimalist',
    preview: '/templates/minimalist-gray.jpg',
    theme: {
      primaryColor: '#6B7280',
      secondaryColor: '#374151',
      accentColor: '#9CA3AF',
      backgroundColor: '#FFFFFF',
      textColor: '#4B5563',
      headingColor: '#1F2937',
      linkColor: '#6B7280',
      borderColor: '#E5E7EB',
      shadowColor: 'rgba(107, 114, 128, 0.1)',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      gradients: {
        primary: 'linear-gradient(135deg, #6B7280 0%, #374151 100%)',
        secondary: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)',
        hero: 'linear-gradient(135deg, rgba(107, 114, 128, 0.9) 0%, rgba(55, 65, 81, 0.9) 100%)',
      },
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      headingFont: 'Inter, sans-serif',
      bodyFont: 'Inter, sans-serif',
      sizes: {
        h1: '2.5rem',
        h2: '2rem',
        h3: '1.5rem',
        body: '1rem',
        small: '0.875rem',
      },
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    layout: {
      containerWidth: '1100px',
      borderRadius: '4px',
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 8px rgba(0, 0, 0, 0.1)',
        lg: '0 8px 16px rgba(0, 0, 0, 0.15)',
        xl: '0 16px 32px rgba(0, 0, 0, 0.2)',
      },
    },
    components: {
      hero: {
        style: 'minimal',
        height: '50vh',
        overlay: false,
      },
      propertyCard: {
        style: 'list',
        showPricing: true,
        showBadges: false,
        hoverEffect: false,
      },
      navigation: {
        style: 'minimal',
        showLogo: true,
        showSearch: false,
      },
      footer: {
        style: 'minimal',
        showContact: true,
        showSocial: false,
      },
    },
  },
  {
    id: 'urban-dark',
    name: 'Urban Dark',
    description: 'Tema escuro moderno, ideal para imóveis urbanos',
    category: 'urban',
    preview: '/templates/urban-dark.jpg',
    theme: {
      primaryColor: '#F59E0B',
      secondaryColor: '#D97706',
      accentColor: '#FBBF24',
      backgroundColor: '#111827',
      textColor: '#D1D5DB',
      headingColor: '#F9FAFB',
      linkColor: '#F59E0B',
      borderColor: '#374151',
      shadowColor: 'rgba(245, 158, 11, 0.2)',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      gradients: {
        primary: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        secondary: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
        hero: 'linear-gradient(135deg, rgba(245, 158, 11, 0.9) 0%, rgba(217, 119, 6, 0.9) 100%)',
      },
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      headingFont: 'Space Grotesk, sans-serif',
      bodyFont: 'Inter, sans-serif',
      sizes: {
        h1: '3.5rem',
        h2: '2.5rem',
        h3: '1.875rem',
        body: '1.125rem',
        small: '1rem',
      },
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    layout: {
      containerWidth: '1200px',
      borderRadius: '8px',
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
      shadows: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
        md: '0 4px 16px rgba(0, 0, 0, 0.4)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
        xl: '0 16px 64px rgba(0, 0, 0, 0.6)',
      },
    },
    components: {
      hero: {
        style: 'gradient',
        height: '80vh',
        overlay: true,
      },
      propertyCard: {
        style: 'card',
        showPricing: true,
        showBadges: true,
        hoverEffect: true,
      },
      navigation: {
        style: 'transparent',
        showLogo: true,
        showSearch: true,
      },
      footer: {
        style: 'social',
        showContact: true,
        showSocial: true,
      },
    },
  },
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    description: 'Clássico e confiável, ideal para imobiliárias tradicionais',
    category: 'classic',
    preview: '/templates/classic-blue.jpg',
    theme: {
      primaryColor: '#1E3A8A',
      secondaryColor: '#1E40AF',
      accentColor: '#3B82F6',
      backgroundColor: '#FFFFFF',
      textColor: '#374151',
      headingColor: '#1F2937',
      linkColor: '#1E3A8A',
      borderColor: '#E5E7EB',
      shadowColor: 'rgba(30, 58, 138, 0.1)',
      successColor: '#059669',
      warningColor: '#D97706',
      errorColor: '#DC2626',
      gradients: {
        primary: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
        secondary: 'linear-gradient(135deg, #3B82F6 0%, #1E3A8A 100%)',
        hero: 'linear-gradient(135deg, rgba(30, 58, 138, 0.9) 0%, rgba(30, 64, 175, 0.9) 100%)',
      },
    },
    typography: {
      fontFamily: 'Georgia, serif',
      headingFont: 'Georgia, serif',
      bodyFont: 'Georgia, serif',
      sizes: {
        h1: '3rem',
        h2: '2.25rem',
        h3: '1.75rem',
        body: '1.125rem',
        small: '1rem',
      },
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    layout: {
      containerWidth: '1140px',
      borderRadius: '6px',
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
      shadows: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
        md: '0 4px 12px rgba(0, 0, 0, 0.15)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.18)',
        xl: '0 16px 48px rgba(0, 0, 0, 0.22)',
      },
    },
    components: {
      hero: {
        style: 'image',
        height: '65vh',
        overlay: true,
      },
      propertyCard: {
        style: 'card',
        showPricing: true,
        showBadges: true,
        hoverEffect: true,
      },
      navigation: {
        style: 'fixed',
        showLogo: true,
        showSearch: true,
      },
      footer: {
        style: 'detailed',
        showContact: true,
        showSocial: true,
      },
    },
  },
];

export function getTemplateById(id: string): MiniSiteTemplate | undefined {
  return MINI_SITE_TEMPLATES.find(template => template.id === id);
}

export function getTemplatesByCategory(category: string): MiniSiteTemplate[] {
  return MINI_SITE_TEMPLATES.filter(template => template.category === category);
}

export const TEMPLATE_CATEGORIES = [
  { id: 'luxury', name: 'Luxo', description: 'Para imóveis de alto padrão' },
  { id: 'modern', name: 'Moderno', description: 'Design contemporâneo' },
  { id: 'classic', name: 'Clássico', description: 'Tradicional e confiável' },
  { id: 'minimalist', name: 'Minimalista', description: 'Limpo e simples' },
  { id: 'tropical', name: 'Tropical', description: 'Inspirado na natureza' },
  { id: 'urban', name: 'Urbano', description: 'Para imóveis urbanos' },
];