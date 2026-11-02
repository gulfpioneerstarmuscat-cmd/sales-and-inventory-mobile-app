import { Platform } from 'react-native';

/**
 * ============================================================================
 * EXPLICIT 3-COLOR SYSTEM ARCHITECTURE & APPLE-INSPIRED DESIGN TOKENS
 * ============================================================================
 * 1. PRIMARY:
 *    - Light Mode Surface: #F8F9FA (Crisp Apple silver-white base)
 *    - Dark Mode Surface / Canvas: #0B0C10 (Deep obsidian space-gray base)
 * 2. SECONDARY:
 *    - Brand Cobalt Blue: #0063F7 (Primary actions, active states, focal gradients)
 * 3. ACCENT:
 *    - Vibrant Sunset Coral: #FF5A36 (High-priority badges, urgent callouts, pop)
 * ============================================================================
 */

export const COLORS = {
  // 1. Primary: Theme-Adaptive Surface & Canvas
  background: '#0B0C10',              // Deep, rich obsidian space-gray base
  backgroundLight: '#F8F9FA',         // Crisp Apple silver-white base
  surface: '#16181F',                 // Primary elevated card surface
  surfaceRaised: '#1F222C',           // Higher elevation / active container surface
  surfaceLight: '#262A36',            // Raised pill / tertiary element
  surfaceGlass: 'rgba(22, 24, 31, 0.88)', // Organic glass surface with blur
  surfaceBorder: 'rgba(255, 255, 255, 0.08)', // Ultra-subtle context-aware border
  surfaceBorderLight: 'rgba(0, 0, 0, 0.06)',
  surfaceBorderActive: 'rgba(0, 99, 247, 0.45)', // Focused blue border

  // 2. Secondary: Core Brand Blue
  primary: '#0063F7',                 // Vibrant Cobalt Blue
  primaryLight: '#3385FF',            // Bright Cobalt Accent
  primaryDark: '#004EC2',             // Deep Pressed Blue
  primaryMuted: 'rgba(0, 99, 247, 0.15)', // Subtle Cobalt Blue glow fill
  primaryGlow: 'rgba(0, 99, 247, 0.25)',

  // 3. Accent: The High-Impact Pop
  accent: '#FF5A36',                  // Vibrant Sunset Coral
  accentLight: '#FF7B5E',             // Bright Sunset Coral
  accentMuted: 'rgba(255, 90, 54, 0.15)', // High-priority badge pill fill
  danger: '#FF5A36',                  // Delete / Alert / Shortage (matches accent mandate)
  dangerMuted: 'rgba(255, 90, 54, 0.15)',

  // Supporting Semantic Statuses
  success: '#10B981',                 // Emerald Green (Cash / In-Stock indicator)
  successMuted: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',                 // Amber Gold (Credit balance / Alerts)
  warningMuted: 'rgba(245, 158, 11, 0.15)',

  // Typography Neutrals (Never pure #000000)
  textPrimary: '#F1F5F9',             // Supreme contrast without harsh glare
  textPrimaryLight: '#1E293B',        // For light mode surfaces
  textSecondary: '#94A3B8',           // Muted slate text
  textMuted: '#64748B',               // Subdued captions & placeholders
  disabled: '#262A36',                // Inactive / Disabled background
  disabledText: '#475569',            // Inactive text

  // Branch Distinct Accents
  branchKhoudh: '#38BDF8',            // Cyan Sky
  branchGhala: '#A855F7',             // Purple Violet
};

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

export const SHADOWS = {
  atmospheric: Platform.select({
    ios: {
      shadowColor: '#0063F7',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0 20px 40px -15px rgba(0, 99, 247, 0.12)',
    } as any,
  }),
  ambientCard: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
    },
    android: {
      elevation: 6,
    },
    web: {
      boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    } as any,
  }),
  floatingNav: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.55,
      shadowRadius: 36,
    },
    android: {
      elevation: 16,
    },
    web: {
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    } as any,
  }),
};
