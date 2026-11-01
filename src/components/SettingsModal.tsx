import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  const handleCheckUpdates = () => {
    Alert.alert('System Up To Date', 'GPS Muscat POS v2.0.0 (Redesign) is running the latest production build.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>APP PREFERENCES</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Preferences Switches */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Haptic Feedback</Text>
                <Text style={styles.settingDesc}>Vibration on button taps & keypad</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ false: COLORS.surfaceBorder, true: COLORS.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Cash Register Beep</Text>
                <Text style={styles.settingDesc}>Sound effect on sale completion</Text>
              </View>
              <Switch
                value={soundsEnabled}
                onValueChange={setSoundsEnabled}
                trackColor={{ false: COLORS.surfaceBorder, true: COLORS.primary }}
              />
            </View>
          </View>

          {/* System & Architecture Info */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Database Slot:</Text>
              <Text style={styles.infoVal}>Supabase Project Slot 2 (Online)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Storage Mode:</Text>
              <Text style={styles.infoVal}>Zero-Image (Text/SKUs only)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build Version:</Text>
              <Text style={styles.infoVal}>2.0.0 (redesign branch)</Text>
            </View>
          </View>

          {/* Check Updates */}
          <TouchableOpacity style={styles.updateBtn} onPress={handleCheckUpdates}>
            <Ionicons name="cloud-download-outline" size={18} color={COLORS.primaryLight} />
            <Text style={styles.updateBtnText}>CHECK FOR OVER-THE-AIR UPDATES</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    maxWidth: 400,
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
  section: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  settingDesc: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: SPACING.sm,
  },
  infoBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 8,
    marginBottom: SPACING.lg,
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
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  updateBtnText: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

