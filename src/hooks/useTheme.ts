import { useState, useEffect } from 'react';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
}

export function useTheme(): ThemeState {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for stored preference first
    const storedTheme = localStorage.getItem('preferredTheme');
    
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
    } else if (storedTheme === 'light') {
      setIsDarkMode(false);
    } else {
      // Fall back to system preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDarkMode);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('preferredTheme', newValue ? 'dark' : 'light');
      return newValue;
    });
  };

  const setDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem('preferredTheme', isDark ? 'dark' : 'light');
  };

  return { isDarkMode, toggleTheme, setDarkMode };
} 