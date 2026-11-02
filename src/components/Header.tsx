import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '../styles/theme';
import { GpsLogo } from './GpsLogo';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onOpenMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMenu }) => {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const verticalPadding = SPACING.md; // 12px equal top & bottom padding

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceGlass,
          borderBottomColor: colors.surfaceBorder,
          paddingTop: insets.top + verticalPadding,
          paddingBottom: verticalPadding,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left: Company Logo (Adapts to Light / Dark Theme) */}
        <View style={styles.logoWrapper}>
          <GpsLogo width={180} height={24} isDark={isDark} />
        </View>

        {/* Right: Hamburger Menu Button */}
        <TouchableOpacity
          style={[
            styles.menuButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
          onPress={onOpenMenu}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
