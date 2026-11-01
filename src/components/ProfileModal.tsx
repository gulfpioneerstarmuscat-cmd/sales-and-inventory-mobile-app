import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';
import { useAuth } from '../context/AuthContext';

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>STAFF PROFILE</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
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
              >
                <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
                <Text style={styles.logoutText}>LOG OUT OF THIS DEVICE</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.primary,
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
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#3B82F633',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
  },
  infoBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 8,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  infoVal: {
    color: COLORS.textPrimary,
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
    backgroundColor: '#EF444422',
    borderWidth: 1,
    borderColor: '#EF444455',
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
  },
});
