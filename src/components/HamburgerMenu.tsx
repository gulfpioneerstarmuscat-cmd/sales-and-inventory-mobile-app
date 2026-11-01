import React from 'react';
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
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';
import { useAuth } from '../context/AuthContext';

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
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Menu List - Clean without descriptions */}
              <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
                {/* 1. Profile */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('profile')}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: '#3B82F622' }]}>
                    <Ionicons name="person-outline" size={20} color={COLORS.primaryLight} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Profile</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 2. Dynamic Switch Branch (e.g. Switch to Ghala / Switch to Al Khoudh) */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleToggleBranch}
                  activeOpacity={isAdmin ? 0.7 : 0.9}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: '#38BDF822' }]}>
                    <Ionicons name="swap-horizontal" size={20} color={COLORS.branchKhoudh} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Switch to {otherBranch}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 3. Dynamic Inter-Branch Transfer (e.g. Transfer to Ghala / Transfer to Al Khoudh) */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('transfer')}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: '#10B98122' }]}>
                    <Ionicons name="paper-plane-outline" size={20} color={COLORS.success} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Transfer to {otherBranch}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 4. Settings */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('settings')}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: '#64748B22' }]}>
                    <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Settings</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 5. Admin Settings (Strictly Hidden for Non-Admins) */}
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleAction('admin')}
                  >
                    <View style={[styles.menuIconContainer, { backgroundColor: '#F59E0B22' }]}>
                      <Ionicons name="shield-outline" size={20} color={COLORS.warning} />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.menuTitle}>Admin Settings</Text>
                        <View style={styles.adminTag}>
                          <Text style={styles.adminTagText}>ADMIN</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}

                <View style={styles.divider} />

                {/* 6. Log Out */}
                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutItem]}
                  onPress={() => handleAction('logout')}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: '#EF444422' }]}>
                    <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuTitle, { color: COLORS.danger }]}>Log Out</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>

              {/* Version Tag */}
              <View style={styles.drawerFooter}>
                <Text style={styles.footerVersion}>GPS Muscat POS • v2.0.0 (Redesign)</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  drawer: {
    width: '82%',
    maxWidth: 360,
    height: '100%',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.surfaceBorder,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeAdmin: {
    backgroundColor: '#F59E0B33',
  },
  badgeStaff: {
    backgroundColor: '#3B82F633',
  },
  roleText: {
    fontSize: FONTS.sizes.xs - 2,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userBranch: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: SPACING.md,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 4,
    minHeight: 52,
  },
  logoutItem: {
    marginTop: SPACING.sm,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  menuTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  adminTag: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  adminTagText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
  },
  drawerFooter: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  footerVersion: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs - 1,
  },
});
