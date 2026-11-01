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

export type TabScreen = 'home' | 'pos' | 'history' | 'inventory';

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
    { id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
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
                {/* Active indicator dot */}
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Docked Cart / Back Button */}
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
                <View style={styles.cartBadgeCount}>
                  <Text style={styles.cartCountText}>{cartItemCount}</Text>
                </View>
                <View style={styles.cartInfoColumn}>
                  <Text style={styles.cartReviewLabel}>CHECKOUT</Text>
                  <Text style={styles.cartTotalText}>
                    {cartTotal.toFixed(3)} <Text style={styles.omrSub}>OMR</Text>
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
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
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
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
    paddingVertical: 6,
    paddingHorizontal: 16,
    minWidth: 64,
    borderRadius: RADIUS.pill,
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: FONTS.sizes.xs - 1,
    marginTop: 2,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inactiveTabLabel: {
    color: COLORS.textSecondary,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  cartPill: {
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: TOUCH_TARGET.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
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
    gap: SPACING.sm,
  },
  cartBadgeCount: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.pill,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartCountText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xs,
    fontWeight: '900',
  },
  cartInfoColumn: {
    alignItems: 'flex-start',
  },
  cartReviewLabel: {
    color: '#FFFFFFEE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cartTotalText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '900',
  },
  omrSub: {
    fontSize: 9,
    fontWeight: '600',
  },
  cartPillText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

