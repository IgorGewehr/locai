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

  // Sidebar scrollbar with cyan theme
  sidebar: {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(6, 182, 212, 0.3) rgba(255, 255, 255, 0.05)',
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '3px',
      margin: '8px 0',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))',
      borderRadius: '3px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.5), rgba(8, 145, 178, 0.5))',
        boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
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