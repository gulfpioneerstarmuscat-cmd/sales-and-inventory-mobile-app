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
                {/* Active indicator dot */}
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Docked Circular Cart / Back Button */}
        {showCartPill && (
          <TouchableOpacity
            style={[
              styles.cartCircle,
              posPage === 2 ? styles.cartCircleBack : styles.cartCircleProceed,
            ]}
            onPress={onPressCartButton}
            activeOpacity={0.8}
          >
            {posPage === 2 ? (
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            ) : (
              <View style={styles.cartCircleContent}>
                <Ionicons name="cart" size={22} color="#FFFFFF" />
                <View style={styles.badgeOverlay}>
                  <Text style={styles.badgeCountText}>{cartItemCount}</Text>
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
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  cartCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  cartCircleProceed: {
    backgroundColor: COLORS.success,
    borderColor: '#34D399',
  },
  cartCircleBack: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.surfaceBorder,
  },
  cartCircleContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 32,
    height: 32,
  },
  badgeOverlay: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeCountText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '900',
  },
});

