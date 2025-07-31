'use client';

import { useEffect } from 'react';
import { useThemeMode } from '@/contexts/ThemeContext';

export default function ThemeAwareBackground() {
  const { mode } = useThemeMode();

  useEffect(() => {
    // Apply sophisticated theme-aware background gradients
    if (mode === 'light') {
      // Light theme: Soft, elegant gradient with subtle color variations
      document.body.style.background = `
        linear-gradient(135deg, 
          #f8fafc 0%, 
          #f1f5f9 25%, 
          #e2e8f0 50%, 
          #f1f5f9 75%, 
          #f8fafc 100%
        )`;
      document.body.style.minHeight = '100vh';
    } else {
      // Dark theme: Deep, mysterious gradient with rich blacks
      document.body.style.background = `
        linear-gradient(135deg, 
          #0a0a0a 0%, 
          #111827 25%, 
          #1f2937 50%, 
          #111827 75%, 
          #0a0a0a 100%
        )`;
      document.body.style.minHeight = '100vh';
    }
  }, [mode]);

  return null;
}