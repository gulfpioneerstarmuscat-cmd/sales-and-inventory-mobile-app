import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '../styles/theme';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMenu }) => {
  const insets = useSafeAreaInsets();
  const { activeBranch, switchBranch, isAdmin, currentUser } = useAuth();

  const handleToggleBranch = () => {
    if (isAdmin) {
      const nextBranch = activeBranch === 'Al Khoudh' ? 'Ghala' : 'Al Khoudh';
      switchBranch(nextBranch);
    }
  };

  const isKhoudh = activeBranch === 'Al Khoudh';

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.content}>
        {/* Left: Branding */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>GPS MUSCAT</Text>
            <Text style={styles.brandSubtitle}>SECURITY AUTOMATION B2B</Text>
          </View>
        </View>

        {/* Right: Branch Pill & Hamburger */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[
              styles.branchPill,
              isKhoudh ? styles.branchKhoudh : styles.branchGhala,
            ]}
            onPress={handleToggleBranch}
            activeOpacity={isAdmin ? 0.7 : 1}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isKhoudh ? COLORS.branchKhoudh : COLORS.branchGhala },
              ]}
            />
            <Text style={styles.branchText}>{activeBranch}</Text>
            {isAdmin && (
              <Ionicons
                name="swap-horizontal"
                size={14}
                color={COLORS.textSecondary}
                style={styles.swapIcon}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={onOpenMenu}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs - 2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  branchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
  },
  branchKhoudh: {
    borderColor: '#38BDF855',
  },
  branchGhala: {
    borderColor: '#A855F755',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  branchText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  swapIcon: {
    marginLeft: 4,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

