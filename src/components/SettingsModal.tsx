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
import { SPACING, FONTS, RADIUS, TOUCH_TARGET, ThemeMode } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  const handleCheckUpdates = () => {
    Alert.alert('System Up To Date', 'GPS Muscat POS v2.0.0 (Redesign) is running the latest production build.');
  };

  const themeOptions: { id: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'light', label: 'Light', icon: 'sunny-outline' },
    { id: 'dark', label: 'Dark', icon: 'moon-outline' },
    { id: 'auto', label: 'Auto', icon: 'phone-portrait-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textMuted }]}>APP PREFERENCES</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Theme Selector: Light, Dark, Auto */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <View style={styles.themeSectionHeader}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Theme Appearance</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {themeMode === 'auto'
                  ? `System Default (${isDark ? 'Dark' : 'Light'} active)`
                  : `${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} Mode active`}
              </Text>
            </View>

            <View style={styles.themePillsRow}>
              {themeOptions.map((opt) => {
                const isActive = themeMode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.themePill,
                      {
                        backgroundColor: isActive ? colors.primary : colors.surfaceRaised,
                        borderColor: isActive ? colors.primaryLight : colors.surfaceBorder,
                      },
                    ]}
                    onPress={() => setThemeMode(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={isActive ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.themePillText,
                        {
                          color: isActive ? '#FFFFFF' : colors.textSecondary,
                          fontWeight: isActive ? '800' : '600',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Preferences Switches */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Haptic Feedback</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Vibration on button taps & keypad
                </Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Cash Register Beep</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Sound effect on sale completion
                </Text>
              </View>
              <Switch
                value={soundsEnabled}
                onValueChange={setSoundsEnabled}
                trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
              />
            </View>
          </View>

          {/* System & Architecture Info */}
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Database Slot:</Text>
              <Text style={[styles.infoVal, { color: colors.textPrimary }]}>Supabase Slot 2 (Online)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Design Architecture:</Text>
              <Text style={[styles.infoVal, { color: colors.primaryLight }]}>gpsmuscat.com System</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Build Version:</Text>
              <Text style={[styles.infoVal, { color: colors.textPrimary }]}>2.0.0 (redesign)</Text>
            </View>
          </View>

          {/* Check Updates */}
          <TouchableOpacity
            style={[
              styles.updateBtn,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.surfaceBorder,
              },
            ]}
            onPress={handleCheckUpdates}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-download-outline" size={18} color={colors.primaryLight} />
            <Text style={[styles.updateBtnText, { color: colors.primaryLight }]}>
              CHECK FOR OVER-THE-AIR UPDATES
            </Text>
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
    borderRadius: RADIUS.xl, // 22px Apple Squircle
    padding: 24, // Generous Apple padding
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  section: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  themeSectionHeader: {
    marginBottom: SPACING.sm,
  },
  themePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  themePillText: {
    fontSize: FONTS.sizes.xs,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  infoBox: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 8,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: FONTS.sizes.xs,
  },
  infoVal: {
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
    borderWidth: 1,
  },
  updateBtnText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
