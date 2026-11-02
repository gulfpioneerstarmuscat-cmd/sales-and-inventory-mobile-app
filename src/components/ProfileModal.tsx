import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS, RADIUS, TOUCH_TARGET, ThemeColors } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  onLogout,
}) => {
  const { currentUser, activeBranch } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>STAFF PROFILE</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                  </Text>
                </View>
                <Text style={styles.name}>{currentUser?.name}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {currentUser?.role?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Assigned Branch:</Text>
                  <Text style={styles.infoVal}>{currentUser?.branch}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Active Session Branch:</Text>
                  <Text style={styles.infoVal}>{activeBranch}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Login PIN:</Text>
                  <Text style={styles.infoVal}>•••• ({currentUser?.pin})</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoVal}>{currentUser?.phone || 'Not set'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={styles.logoutText}>LOG OUT OF THIS DEVICE</Text>
              </TouchableOpacity>
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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl, // 22px Apple Squircle
      padding: 24, // Generous Apple padding
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    title: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    closeBtn: {
      padding: SPACING.xs,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.xl,
      fontWeight: '900',
    },
    name: {
      color: colors.textPrimary,
      fontSize: FONTS.sizes.md,
      fontWeight: '800',
    },
    badgeRow: {
      flexDirection: 'row',
      marginTop: 4,
    },
    badge: {
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: {
      color: colors.primaryLight,
      fontSize: 10,
      fontWeight: '800',
    },
    infoBox: {
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      gap: 8,
      marginBottom: SPACING.xl,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    infoLabel: {
      color: colors.textSecondary,
      fontSize: FONTS.sizes.xs,
    },
    infoVal: {
      color: colors.textPrimary,
      fontSize: FONTS.sizes.xs,
      fontWeight: '700',
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: TOUCH_TARGET.buttonHeight,
      borderRadius: RADIUS.md,
      backgroundColor: colors.dangerMuted,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    logoutText: {
      color: colors.danger,
      fontSize: FONTS.sizes.sm,
      fontWeight: '800',
    },
  });
