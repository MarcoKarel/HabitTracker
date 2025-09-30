import { useColorScheme } from 'react-native';

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

// Dark theme colors
const darkTheme = {
  // Background colors
  background: '#000000',
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  
  // Primary colors
  primary: '#0A84FF',
  primaryVariant: '#409CFF',
  
  // Accent colors
  accent: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  
  // Card and component colors
  card: '#1C1C1E',
  cardBorder: '#38383A',
  inputBackground: '#2C2C2E',
  inputBorder: '#38383A',
  
  // Navigation
  tabBar: '#1C1C1E',
  tabBarBorder: '#38383A',
  
  // Shadow
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
};

// Hook to get current theme based on device preference
export const useTheme = () => {
  const colorScheme = useColorScheme();
  
  return {
    colors: colorScheme === 'dark' ? darkTheme : lightTheme,
    isDark: colorScheme === 'dark',
    isLight: colorScheme === 'light',
  };
};

// Common spacing and sizing constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
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

  return {
    ...elevations[elevation],
    shadowColor: theme.colors.shadow,
  };
};