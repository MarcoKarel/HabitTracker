import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme, Dimensions, PixelRatio } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Light theme colors
const lightTheme = {
  // Background colors
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceVariant: '#F1F3F4',
  
  // Text colors
  text: '#1C1C1E',
  textSecondary: '#666666',
  textTertiary: '#8E8E93',
  
  // Primary colors
  primary: '#007AFF',
  primaryVariant: '#0056CC',
  
  // Accent colors
  accent: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  // Card and component colors
  card: '#FFFFFF',
  cardBorder: '#E5E5EA',
  inputBackground: '#F2F2F7',
  inputBorder: '#C7C7CC',
  
  // Navigation
  tabBar: '#F8F9FA',
  tabBarBorder: '#C6C6C8',
  
  // Shadow
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
};


// Dark Habit Tracker Palette (Red-Accent Theme)
// Works beautifully with a minimalist red + black preference
export const darkRedTheme = {
  // Core Backgrounds
  background: '#0D0D0D', // deep charcoal black
  surface: '#1A1A1A', // soft dark grey
  surfaceVariant: '#151515',

  // Borders / dividers
  cardBorder: '#2E2E2E', // subtle lines for separation

  // Text colors
  text: '#FFFFFF', // primary text
  textSecondary: '#B3B3B3', // muted grey
  textDisabled: '#6B6B6B', // disabled text
  textTertiary: '#8E8E93',

  // Accent (Red)
  primary: '#E63946', // Accent Red (buttons & progress)
  primaryVariant: '#FF4D5A', // Accent Hover Red (active states)

  // Optional semantic colors
  success: '#3ECF8E',
  warning: '#E8A317',
  error: '#FF453A',

  // Card and component colors
  card: '#1A1A1A',
  inputBackground: '#131313',
  inputBorder: '#2E2E2E',

  // Navigation
  tabBar: '#0D0D0D',
  tabBarBorder: '#2E2E2E',

  // Charts / Progress
  habitRingBase: '#333333',
  habitRingProgress: '#E63946',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.35)',
  shadowDark: 'rgba(0, 0, 0, 0.6)',
};


// Hook to get current theme based on device preference
const STORAGE_KEY = '@habittracker:colorMode';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [colorMode, setColorMode] = useState('system'); // 'system' | 'light' | 'dark'
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setColorMode(stored);
        }
      } catch (e) {
        // ignore
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  useEffect(() => {
    // persist
    const save = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, colorMode);
      } catch (e) {
        // ignore
      }
    };
    if (ready) save();
  }, [colorMode, ready]);

  const effectiveScheme = colorMode === 'system' ? systemScheme : colorMode;
  const colors = effectiveScheme === 'dark' ? darkRedTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ colors, isDark: effectiveScheme === 'dark', isLight: effectiveScheme === 'light', colorMode, setColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to consume theme from context
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback to system-only behavior if provider is missing
    const system = useColorScheme();
    const colors = system === 'dark' ? darkRedTheme : lightTheme;
    return { colors, isDark: system === 'dark', isLight: system === 'light', colorMode: 'system', setColorMode: () => {} };
  }

  return ctx;
};

// Common spacing and sizing constants
// Responsive scaling helpers
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Guideline sizes are based on standard ~iPhone 11/12 dimensions
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Common spacing and sizing constants (scaled for device size)
export const spacing = {
  xs: Math.round(moderateScale(4)),
  sm: Math.round(moderateScale(8)),
  md: Math.round(moderateScale(16)),
  lg: Math.round(moderateScale(24)),
  xl: Math.round(moderateScale(32)),
  xxl: Math.round(moderateScale(48)),
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// Scaled font sizes
export const fontSize = {
  xs: Math.round(moderateScale(12)),
  sm: Math.round(moderateScale(14)),
  md: Math.round(moderateScale(16)),
  lg: Math.round(moderateScale(18)),
  xl: Math.round(moderateScale(20)),
  xxl: Math.round(moderateScale(24)),
  xxxl: Math.round(moderateScale(32)),
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

// Common shadow styles for both themes
export const getShadowStyle = (theme, elevation = 'default') => {
  const elevations = {
    small: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    default: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    large: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  };

  const shadowColor = theme?.colors?.shadow || 'rgba(0, 0, 0, 0.1)';

  return {
    ...elevations[elevation],
    shadowColor: shadowColor,
  };
};

// Export scaling helpers for use in components/styles
export const responsive = {
  scale,
  verticalScale,
  moderateScale,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  guidelineBaseWidth,
  guidelineBaseHeight,
};