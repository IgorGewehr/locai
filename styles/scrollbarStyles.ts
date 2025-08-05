// Modern scrollbar styles for inline usage with MUI sx prop

export const scrollbarStyles = {
  // Hidden scrollbar but maintains functionality
  hidden: {
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE and Edge
    '&::-webkit-scrollbar': {
      display: 'none', // Chrome, Safari and Opera
    },
  },

  // Sidebar scrollbar with cyan theme - ultra modern and responsive
  sidebar: {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(6, 182, 212, 0.15) transparent',
    
    // Mobile: scrollbar completamente invisível até interação
    '@media (max-width: 768px)': {
      '&::-webkit-scrollbar': {
        width: '2px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(6, 182, 212, 0.1)',
        borderRadius: '1px',
        opacity: 0,
        transition: 'opacity 0.3s ease',
        '&:hover': {
          background: 'rgba(6, 182, 212, 0.2)',
          opacity: 1,
        },
      },
      // Mostrar apenas durante scroll
      '&:hover::-webkit-scrollbar-thumb': {
        opacity: 0.5,
      },
      '&:active::-webkit-scrollbar-thumb': {
        opacity: 1,
      },
    },
    
    // Desktop: scrollbar minimalista com efeito glass
    '@media (min-width: 769px)': {
      '&::-webkit-scrollbar': {
        width: '4px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
        margin: '16px 0',
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
        borderRadius: '2px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(6, 182, 212, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.3) 0%, rgba(6, 182, 212, 0.2) 100%)',
          boxShadow: '0 0 12px rgba(6, 182, 212, 0.2)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
        },
        '&:active': {
          background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.4) 0%, rgba(6, 182, 212, 0.3) 100%)',
        },
      },
    },
  },

  // Card content scrollbar
  card: {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(139, 92, 246, 0.2) transparent',
    '&::-webkit-scrollbar': {
      width: '4px',
      height: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
      borderRadius: '2px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'rgba(139, 92, 246, 0.2)',
      borderRadius: '2px',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: 'rgba(139, 92, 246, 0.4)',
      },
    },
  },

  // Dashboard list scrollbar (hidden by default, appears on hover)
  dashboardList: {
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {
      width: '0px',
      background: 'transparent',
    },
    '&:hover': {
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
      '&::-webkit-scrollbar': {
        width: '4px',
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '2px',
      },
    },
  },

  // Table scrollbar
  table: {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(99, 102, 241, 0.3) rgba(255, 255, 255, 0.05)',
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'rgba(99, 102, 241, 0.3)',
      borderRadius: '4px',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: 'rgba(99, 102, 241, 0.5)',
      },
    },
    '&::-webkit-scrollbar-corner': {
      background: 'rgba(255, 255, 255, 0.05)',
    },
  },

  // Thin scrollbar for minimal spaces
  thin: {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
    '&::-webkit-scrollbar': {
      width: '3px',
      height: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },

  // Ultra modern - appears only on scroll
  sidebarModern: {
    scrollbarWidth: 'none',
    scrollbarColor: 'transparent transparent',
    
    '&::-webkit-scrollbar': {
      width: '4px',
      opacity: 0,
      transition: 'opacity 0.3s ease',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'transparent',
      borderRadius: '2px',
      transition: 'background 0.3s ease',
    },
    
    // Aparece durante o scroll
    '&:hover::-webkit-scrollbar-thumb': {
      background: 'rgba(6, 182, 212, 0.15)',
    },
    
    '&::-webkit-scrollbar-thumb:hover': {
      background: 'rgba(6, 182, 212, 0.3)',
    },
    
    // Para navegadores que suportam scrollbar-gutter
    scrollbarGutter: 'stable',
  },

  // Glass effect scrollbar
  glass: {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(99, 102, 241, 0.3) rgba(255, 255, 255, 0.05)',
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '4px',
      backdropFilter: 'blur(10px)',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.4))',
      borderRadius: '4px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.6))',
        transform: 'scale(1.1)',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
      },
    },
  },
};

// Mobile-friendly scrollbar (hidden on small screens)
export const mobileScrollbarStyles = {
  hidden: {
    '@media (max-width: 768px)': scrollbarStyles.hidden,
  },
};