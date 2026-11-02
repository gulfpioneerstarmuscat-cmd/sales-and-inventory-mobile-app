import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../styles/theme';
import { GpsLogo } from './GpsLogo';

interface HeaderProps {
  onOpenMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMenu }) => {
  const insets = useSafeAreaInsets();
  const verticalPadding = SPACING.md; // 12px equal top & bottom padding

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + verticalPadding,
          paddingBottom: verticalPadding,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left: Company Logo */}
        <View style={styles.logoWrapper}>
          <GpsLogo width={180} height={24} />
        </View>

        {/* Right: Hamburger Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onOpenMenu}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingHorizontal: SPACING.lg,
    zIndex: 10,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      } as any,
    }),
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
  },
  logoWrapper: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md, // 12px squircle
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
