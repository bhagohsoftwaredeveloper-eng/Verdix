'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function useAppearance() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [posTheme, setPosTheme] = useState<string>('system');

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('pos-theme');
    if (stored) setPosTheme(stored);
  }, []);

  const handleAppThemeChange = (value: string) => {
    setTheme(value);
    localStorage.setItem('admin-theme', value);
  };

  const handlePosThemeChange = (value: string) => {
    setPosTheme(value);
    localStorage.setItem('pos-theme', value);
  };

  return { theme, posTheme, mounted, handleAppThemeChange, handlePosThemeChange };
}
