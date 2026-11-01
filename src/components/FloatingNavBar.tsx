import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';

export type TabScreen = 'pos' | 'history' | 'inventory';

interface FloatingNavBarProps {
  currentTab: TabScreen;
  onSelectTab: (tab: TabScreen) => void;
  cartItemCount?: number;
  cartTotal?: number;
  posPage?: 1 | 2;
  onPressCartButton?: () => void;
  translateY?: Animated.Value; // For scroll-hide animation
}

export const FloatingNavBar: React.FC<FloatingNavBarProps> = ({
  currentTab,
  onSelectTab,
  cartItemCount = 0,
  cartTotal = 0,
  posPage = 1,
  onPressCartButton,
  translateY,
}) => {
  const insets = useSafeAreaInsets();
  const showCartPill = currentTab === 'pos' && cartItemCount > 0;

  const tabs: Array<{ id: TabScreen; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }> = [
    { id: 'pos', label: 'POS', icon: 'cart-outline', activeIcon: 'cart' },
    { id: 'history', label: 'History', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'inventory', label: 'Stock', icon: 'cube-outline', activeIcon: 'cube' },
  ];

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
        {/* Main 4-Tab Floating Bar */}
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
                  size={22}
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

        {/* Dynamic Docked Cart Pill / Back Button */}
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
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                <Text style={styles.cartPillText}>BACK</Text>
              </View>
            ) : (
              <View style={styles.cartContentRow}>
                <Ionicons name="cart" size={20} color="#FFFFFF" />
                <Text style={styles.cartCountNumber}>{cartItemCount}</Text>
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
    paddingHorizontal: SPACING.md,
    maxWidth: 540,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293BE6', // Blur-like translucent slate
    borderRadius: 28,
    height: 56,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#334155AA',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
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
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: FONTS.sizes.xs - 1,
    marginTop: 1,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inactiveTabLabel: {
    color: COLORS.textSecondary,
  },
  cartPill: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  cartPillProceed: {
    backgroundColor: COLORS.success,
    borderColor: '#34D399',
  },
  cartPillBack: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.surfaceBorder,
  },
  cartContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartCountNumber: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
  },
  cartPillText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

