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
    id: 'alugazap-theme',
    name: 'AlugZap',
    description: 'Tema oficial do AlugZap - Design profissional e moderno',
    category: 'modern',
    preview: '/templates/alugazap-theme.jpg',
    theme: {
      primaryColor: '#06b6d4', // AlugZap cyan
      secondaryColor: '#0891b2', // AlugZap darker cyan
      accentColor: '#22c55e', // AlugZap green
      backgroundColor: '#0f172a', // AlugZap dark slate
      textColor: '#e2e8f0', // AlugZap light slate
      headingColor: '#ffffff', // White for headings
      linkColor: '#06b6d4', // AlugZap cyan for links
      borderColor: 'rgba(255, 255, 255, 0.1)', // Semi-transparent white borders
      shadowColor: 'rgba(6, 182, 212, 0.3)', // Cyan shadow
      successColor: '#22c55e', // Green for success
      warningColor: '#f59e0b', // Amber for warnings
      errorColor: '#ef4444', // Red for errors
      gradients: {
        primary: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        secondary: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        hero: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 50%, rgba(51, 65, 85, 0.85) 100%)',
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
        sm: '0 2px 8px rgba(6, 182, 212, 0.1)',
        md: '0 4px 16px rgba(6, 182, 212, 0.2)',
        lg: '0 8px 32px rgba(6, 182, 212, 0.3)',
        xl: '0 16px 64px rgba(6, 182, 212, 0.4)',
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
        style: 'sticky',
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
  { id: 'modern', name: 'AlugZap', description: 'Design profissional e moderno' },
];