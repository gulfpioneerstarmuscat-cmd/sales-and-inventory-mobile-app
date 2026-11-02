import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '../styles/theme';

export type TabScreen = 'pos' | 'history' | 'inventory';

interface TabConfig {
  id: TabScreen;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

interface FloatingNavBarProps {
  currentTab: TabScreen;
  onSelectTab: (tab: TabScreen) => void;
  cartItemCount?: number;
  cartTotal?: number;
  posPage?: 1 | 2;
  onPressCartButton?: () => void;
  translateY?: Animated.Value;
}

export const FloatingNavBar: React.FC<FloatingNavBarProps> = ({
  currentTab,
  onSelectTab,
  cartItemCount = 0,
  posPage = 1,
  onPressCartButton,
  translateY,
}) => {
  const insets = useSafeAreaInsets();

  const tabs: TabConfig[] = [
    { id: 'pos', label: 'POS', icon: 'cart-outline', activeIcon: 'cart' },
    { id: 'history', label: 'History', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'inventory', label: 'Stock', icon: 'cube-outline', activeIcon: 'cube' },
  ];

  const showCartPill = currentTab === 'pos' && (cartItemCount > 0 || posPage === 2);

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          bottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
          transform: [{ translateY: translateY || 0 }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.pillGroup}>
        {/* Main 3-Tab Floating Bar */}
        <View style={styles.navBar}>
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, isActive && styles.activeTabButton]}
                onPress={() => onSelectTab(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={20}
                  color={isActive ? '#FFFFFF' : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Docked Cart Pill / Back Button with High-Impact Sunset Coral Pop */}
        {showCartPill && (
          <TouchableOpacity
            style={[
              styles.cartPill,
              posPage === 2 ? styles.cartPillBack : styles.cartPillProceed,
            ]}
            onPress={onPressCartButton}
            activeOpacity={0.8}
          >
            {posPage === 2 ? (
              <View style={styles.cartContentRow}>
                <Ionicons name="arrow-back" size={18} color={COLORS.textPrimary} />
                <Text style={styles.cartPillText}>BACK</Text>
              </View>
            ) : (
              <View style={styles.cartContentRow}>
                <Ionicons name="cart" size={19} color="#FFFFFF" />
                <View style={styles.accentBadge}>
                  <Text style={styles.cartCountNumber}>{cartItemCount}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  pillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    maxWidth: 540,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 12, 16, 0.90)', // Apple obsidian translucent glass
    borderRadius: 28,
    height: 56,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#0063F7',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 28,
      },
      android: {
        elevation: 16,
      },
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 20px 40px -15px rgba(0, 99, 247, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      } as any,
    }),
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 16,
    minWidth: 64,
    borderRadius: RADIUS.pill,
  },
  activeTabButton: {
    backgroundColor: COLORS.primary, // Vibrant Cobalt Blue
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 99, 247, 0.4)',
      } as any,
    }),
  },
  tabLabel: {
    fontSize: FONTS.sizes.xs - 1,
    marginTop: 2,
    letterSpacing: FONTS.metrics.bodyTracking,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inactiveTabLabel: {
    color: COLORS.textSecondary,
  },
  cartPill: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0063F7',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2,
        shadowRadius: 28,
      },
      android: {
        elevation: 16,
      },
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 20px 40px -15px rgba(0, 99, 247, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      } as any,
    }),
  },
  cartPillProceed: {
    backgroundColor: COLORS.primary, // Vibrant Cobalt Blue
    borderColor: 'rgba(0, 99, 247, 0.6)',
  },
  cartPillBack: {
    backgroundColor: 'rgba(31, 34, 44, 0.92)',
    borderColor: COLORS.surfaceBorder,
  },
  cartContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentBadge: {
    backgroundColor: COLORS.accent, // Vibrant Sunset Coral - The High-Impact Pop
    borderRadius: RADIUS.pill,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartCountNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cartPillText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
