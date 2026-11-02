import { Platform } from 'react-native';

/**
 * ============================================================================
 * GPS MUSCAT POS - THEME DESIGN SYSTEM & DESIGN TOKENS
 * Inspired directly by gpsmuscat.com visual architecture
 * ============================================================================
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  // Canvases & Surfaces
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceLight: string;
  surfaceGlass: string;
  surfaceBorder: string;
  surfaceBorderLight: string;
  surfaceBorderActive: string;

  // Brand Blues (gpsmuscat.com identity)
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  primaryGlow: string;

  // Accents & Signals
  accent: string;
  accentLight: string;
  accentMuted: string;
  danger: string;
  dangerMuted: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;

  // Typography Neutrals
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  disabled: string;
  disabledText: string;

  // Branch Distinct Accents
  branchKhoudh: string;
  branchGhala: string;

  // Form & Card Surfaces
  inputBackground: string;
  inputBorder: string;
  cardBackground: string;

  // Ambient Gradient Meshes
  ambientGradientStart: string;
  ambientGradientMid: string;
  ambientGradientEnd: string;
}

export const DARK_THEME_COLORS: ThemeColors = {
  // 1. Primary: Dark Obsidian Canvas (gpsmuscat.com)
  background: '#030712',
  surface: '#0F172A',
  surfaceRaised: '#1E293B',
  surfaceLight: '#334155',
  surfaceGlass: 'rgba(15, 23, 42, 0.88)',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  surfaceBorderLight: 'rgba(255, 255, 255, 0.05)',
  surfaceBorderActive: 'rgba(14, 165, 233, 0.45)',

  // 2. Secondary: GPS Muscat Vibrant Blue & Sky Cyan
  primary: '#0063F7',
  primaryLight: '#0EA5E9',
  primaryDark: '#004EC2',
  primaryMuted: 'rgba(0, 99, 247, 0.16)',
  primaryGlow: 'rgba(14, 165, 233, 0.25)',

  // 3. Accent: Sunset Coral
  accent: '#FF5A36',
  accentLight: '#FF7B5E',
  accentMuted: 'rgba(255, 90, 54, 0.16)',
  danger: '#FF5A36',
  dangerMuted: 'rgba(255, 90, 54, 0.16)',

  // Statuses
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.16)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.16)',

  // Text Neutrals
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  disabled: '#1E293B',
  disabledText: '#475569',

  // Branches
  branchKhoudh: '#38BDF8',
  branchGhala: '#A855F7',

  // Forms
  inputBackground: '#0F172A',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  cardBackground: '#0F172A',

  // Gradients
  ambientGradientStart: '#020617',
  ambientGradientMid: '#0B1528',
  ambientGradientEnd: '#030712',
};

export const LIGHT_THEME_COLORS: ThemeColors = {
  // 1. Primary: Crisp Slate-50 Base (gpsmuscat.com light mode)
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceRaised: '#F1F5F9',
  surfaceLight: '#E2E8F0',
  surfaceGlass: 'rgba(255, 255, 255, 0.92)',
  surfaceBorder: 'rgba(0, 0, 0, 0.08)',
  surfaceBorderLight: 'rgba(0, 0, 0, 0.04)',
  surfaceBorderActive: 'rgba(0, 99, 247, 0.45)',

  // 2. Secondary: GPS Muscat Vibrant Blue & Sky Cyan
  primary: '#0063F7',
  primaryLight: '#0284C7',
  primaryDark: '#004EC2',
  primaryMuted: 'rgba(0, 99, 247, 0.10)',
  primaryGlow: 'rgba(0, 99, 247, 0.18)',

  // 3. Accent: Sunset Coral
  accent: '#FF5A36',
  accentLight: '#FF7B5E',
  accentMuted: 'rgba(255, 90, 54, 0.12)',
  danger: '#FF5A36',
  dangerMuted: 'rgba(255, 90, 54, 0.12)',

  // Statuses
  success: '#059669',
  successMuted: 'rgba(5, 150, 105, 0.12)',
  warning: '#D97706',
  warningMuted: 'rgba(217, 119, 6, 0.12)',

  // Text Neutrals
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  disabled: '#F1F5F9',
  disabledText: '#94A3B8',

  // Branches
  branchKhoudh: '#0284C7',
  branchGhala: '#9333EA',

  // Forms
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
  cardBackground: '#FFFFFF',

  // Gradients
  ambientGradientStart: '#F8FAFC',
  ambientGradientMid: '#F0F9FF',
  ambientGradientEnd: '#EEF2F6',
};

// Default export for backward compatibility
export const COLORS = DARK_THEME_COLORS;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  wide: 48,
  epic: 64,
};

export const FONTS = {
  family: Platform.select({
    ios: '-apple-system',
    android: 'Roboto',
    default: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }),
  metrics: {
    headerTracking: -0.5,             // Tight tracking (-0.03em)
    headerLineHeight: 1.15,
    bodyTracking: -0.2,               // Generous body tracking (-0.01em)
    bodyLineHeight: 1.5,
  },
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    giant: 36,
  },
};

export const RADIUS = {
  sm: 10,                             // Small components (badges, chips)
  md: 12,                             // Action buttons, pills, toggles
  lg: 18,                             // Apple squircle inputs, product cards
  xl: 22,                             // Major cards, summary containers
  xxl: 24,                            // Modals, major outer containers
  pill: 9999,
};

export const TOUCH_TARGET = {
  minHeight: 48,                      // Minimum Apple tap target (>= 44px)
  buttonHeight: 52,
  inputHeight: 52,
};

export const getShadows = (isDark: boolean) => ({
  atmospheric: Platform.select({
    ios: {
      shadowColor: '#0063F7',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: isDark ? 0.12 : 0.08,
      shadowRadius: 28,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: isDark
        ? '0 20px 40px -15px rgba(0, 99, 247, 0.14)'
        : '0 20px 40px -15px rgba(0, 99, 247, 0.10)',
    } as any,
  }),
  ambientCard: Platform.select({
    ios: {
      shadowColor: isDark ? '#000000' : '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.45 : 0.06,
      shadowRadius: 24,
    },
    android: {
      elevation: isDark ? 6 : 3,
    },
    web: {
      boxShadow: isDark
        ? '0 16px 36px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
        : '0 12px 32px -8px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.06)',
    } as any,
  }),
  floatingNav: Platform.select({
    ios: {
      shadowColor: isDark ? '#000000' : '#0F172A',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: isDark ? 0.55 : 0.12,
      shadowRadius: 36,
    },
    android: {
      elevation: 16,
    },
    web: {
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      boxShadow: isDark
        ? '0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)'
        : '0 24px 48px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)',
    } as any,
  }),
});

export const SHADOWS = getShadows(true);
