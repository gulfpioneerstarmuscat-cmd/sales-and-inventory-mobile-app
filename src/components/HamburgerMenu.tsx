import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, FONTS, RADIUS, TOUCH_TARGET, ThemeColors } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (option: 'profile' | 'switch_branch' | 'transfer' | 'settings' | 'admin' | 'logout') => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  visible,
  onClose,
  onSelectOption,
}) => {
  const insets = useSafeAreaInsets();
  const { currentUser, activeBranch, isAdmin, switchBranch } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const handleAction = (option: 'profile' | 'switch_branch' | 'transfer' | 'settings' | 'admin' | 'logout') => {
    onClose();
    setTimeout(() => {
      onSelectOption(option);
    }, 150);
  };

  const otherBranch = activeBranch === 'Al Khoudh' ? 'Ghala' : 'Al Khoudh';

  const handleToggleBranch = () => {
    if (isAdmin) {
      switchBranch(otherBranch);
      handleAction('switch_branch');
    } else {
      Alert.alert(
        'Branch Locked',
        `Staff accounts are locked to ${currentUser?.branch || activeBranch}. Only Administrators can switch branches.`
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.drawer,
                { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.lg },
              ]}
            >
              {/* Drawer Header */}
              <View style={styles.drawerHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>{currentUser?.name || 'Staff User'}</Text>
                    <View style={styles.roleRow}>
                      <View
                        style={[
                          styles.roleBadge,
                          isAdmin ? styles.badgeAdmin : styles.badgeStaff,
                        ]}
                      >
                        <Text style={styles.roleText}>
                          {currentUser?.role?.toUpperCase() || 'STAFF'}
                        </Text>
                      </View>
                      <Text style={styles.userBranch}>• {activeBranch}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Menu List - Clean without descriptions */}
              <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
                {/* 1. Profile Option */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('profile')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="person-outline" size={20} color={colors.primaryLight} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Staff Profile</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Switch Branch Option */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleToggleBranch}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="git-branch-outline" size={20} color={colors.branchKhoudh} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>
                      {isAdmin ? `Switch to ${otherBranch}` : `Branch: ${activeBranch}`}
                    </Text>
                  </View>
                  {!isAdmin && (
                    <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {/* 3. Stock Transfer Option */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('transfer')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="swap-horizontal-outline" size={20} color={colors.success} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Branch Stock Transfer</Text>
                  </View>
                </TouchableOpacity>

                {/* 4. Settings Option */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('settings')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Settings & Theme</Text>
                  </View>
                </TouchableOpacity>

                {/* 5. Admin Panel (Admin only) */}
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleAction('admin')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuIconContainer}>
                      <Ionicons name="shield-outline" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuTitle}>Admin Management</Text>
                    </View>
                    <View style={styles.adminTag}>
                      <Text style={styles.adminTagText}>PRO</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* 6. Logout Option */}
                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutItem]}
                  onPress={() => handleAction('logout')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: colors.accentMuted, borderColor: colors.accent }]}>
                    <Ionicons name="log-out-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuTitle, { color: colors.accent }]}>Sign Out</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>

              {/* Drawer Footer */}
              <View style={styles.drawerFooter}>
                <Text style={styles.footerVersion}>GPS Muscat POS • v2.0.0 (Theme Ready)</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    },
    drawer: {
      width: '84%',
      maxWidth: 360,
      height: '100%',
      backgroundColor: colors.surface,
      paddingHorizontal: 24,
      borderLeftWidth: 1,
      borderLeftColor: colors.surfaceBorder,
    },
    drawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.lg,
      fontWeight: '800',
    },
    userName: {
      color: colors.textPrimary,
      fontSize: FONTS.sizes.md,
      fontWeight: '700',
      letterSpacing: FONTS.metrics.headerTracking,
    },
    roleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      gap: 6,
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.sm,
    },
    badgeAdmin: {
      backgroundColor: colors.accentMuted,
    },
    badgeStaff: {
      backgroundColor: colors.primaryMuted,
    },
    roleText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.5,
    },
    userBranch: {
      color: colors.textSecondary,
      fontSize: FONTS.sizes.xs,
      letterSpacing: FONTS.metrics.bodyTracking,
    },
    closeBtn: {
      padding: SPACING.xs,
    },
    divider: {
      height: 1,
      backgroundColor: colors.surfaceBorder,
      marginVertical: SPACING.lg,
    },
    menuList: {
      flex: 1,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: 8,
      borderRadius: RADIUS.md,
      minHeight: 52,
    },
    logoutItem: {
      marginTop: SPACING.sm,
    },
    menuIconContainer: {
      width: 42,
      height: 42,
      borderRadius: RADIUS.sm,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    menuTextContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    menuTitle: {
      color: colors.textPrimary,
      fontSize: FONTS.sizes.md,
      fontWeight: '600',
      letterSpacing: FONTS.metrics.bodyTracking,
    },
    adminTag: {
      backgroundColor: colors.accentMuted,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: RADIUS.sm,
    },
    adminTagText: {
      color: colors.accent,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    drawerFooter: {
      alignItems: 'center',
      paddingTop: SPACING.md,
      paddingBottom: SPACING.lg,
    },
    footerVersion: {
      color: colors.textMuted,
      fontSize: FONTS.sizes.xs - 1,
      letterSpacing: FONTS.metrics.bodyTracking,
    },
  });
