// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Get system preference
const getSystemPreference = () => {
  if (typeof window === 'undefined') return 'light';
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

// Get effective theme (resolves 'system' to actual theme)
const getEffectiveTheme = (theme) => {
  if (theme === 'system') {
    return getSystemPreference();
  }
  return theme;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then default to system
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      return savedTheme;
    }
    return 'system'; // Default to system preference
  });

  const [effectiveTheme, setEffectiveTheme] = useState(() => getEffectiveTheme(theme));

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const newEffectiveTheme = getSystemPreference();
      setEffectiveTheme(newEffectiveTheme);
      applyTheme(newEffectiveTheme);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  // Apply theme to document
  const applyTheme = (themeToApply) => {
    const root = document.documentElement;
    if (themeToApply === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', themeToApply);
  };

  // Initialize theme on mount
  useEffect(() => {
    const effective = getEffectiveTheme(theme);
    setEffectiveTheme(effective);
    applyTheme(effective);
  }, []);

  // Update theme when it changes
  useEffect(() => {
    // Save theme preference
    localStorage.setItem('app_theme', theme);
    
    // Get and apply effective theme
    const effective = getEffectiveTheme(theme);
    setEffectiveTheme(effective);
    applyTheme(effective);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      // Cycle: light -> dark -> system -> light
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const setThemeMode = (mode) => {
    if (['light', 'dark', 'system'].includes(mode)) {
      setTheme(mode);
    }
  };

  const value = {
    theme, // 'light', 'dark', or 'system'
    effectiveTheme, // 'light' or 'dark' (resolved from system if needed)
    toggleTheme,
    setTheme: setThemeMode,
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};