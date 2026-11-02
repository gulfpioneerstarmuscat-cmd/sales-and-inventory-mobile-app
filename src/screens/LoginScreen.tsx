import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS, RADIUS, TOUCH_TARGET, ThemeColors } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AmbientBackground } from '../components/AmbientBackground';

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { loginWithPin } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = async (digit: string) => {
    if (pin.length < 4 && !loading) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 4) {
        setLoading(true);
        const res = await loginWithPin(newPin);
        setLoading(false);
        if (!res.success) {
          setErrorMsg(res.message || 'Incorrect PIN');
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !loading) {
      setPin((prev) => prev.slice(0, -1));
      setErrorMsg('');
    }
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫'],
  ];

  return (
    <AmbientBackground>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + SPACING.xl,
            paddingBottom: insets.bottom + SPACING.lg,
          },
        ]}
      >
        {/* Branding Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>GPS MUSCAT</Text>
          <Text style={styles.subtitle}>Security Automation Wholesale POS</Text>
        </View>

        {/* PIN Prompt & Dots */}
        <View style={styles.pinSection}>
          <Text style={styles.pinPrompt}>Enter 4-Digit Floor Staff PIN</Text>
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => {
              const filled = pin.length > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    filled && styles.dotFilled,
                    errorMsg ? styles.dotError : null,
                  ]}
                />
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primaryLight} style={styles.statusIndicator} />
          ) : errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : (
            <Text style={styles.hintText}>Al Khoudh & Ghala Branch System</Text>
          )}
        </View>

        {/* Massive Keypad */}
        <View style={styles.keypad}>
          {keys.map((row, rIdx) => (
            <View key={rIdx} style={styles.keyRow}>
              {row.map((k, cIdx) => {
                const isAction = k === 'C' || k === '⌫';
                return (
                  <TouchableOpacity
                    key={cIdx}
                    style={[styles.key, isAction && styles.actionKey]}
                    onPress={() => {
                      if (k === '⌫') handleBackspace();
                      else if (k === 'C') handleClear();
                      else handleDigit(k);
                    }}
                    activeOpacity={0.6}
                  >
                    {k === '⌫' ? (
                      <Ionicons
                        name="backspace-outline"
                        size={28}
                        color={colors.textPrimary}
                      />
                    ) : (
                      <Text style={styles.keyText}>{k}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Demo Credentials Pill */}
        <View style={styles.demoHelper}>
          <Text style={styles.demoTitle}>Staff Quick PINs</Text>
          <View style={styles.demoPills}>
            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => setPin('1111')}
            >
              <Text style={styles.demoPillText}>Admin: 1111</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => setPin('2222')}
            >
              <Text style={styles.demoPillText}>Salim: 2222</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => setPin('3333')}
            >
              <Text style={styles.demoPillText}>Nasser: 3333</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AmbientBackground>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.xl,
    },
    header: {
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    logoBadge: {
      width: 64,
      height: 64,
      borderRadius: RADIUS.lg, // 18px squircle
      backgroundColor: colors.primary, // Vibrant Cobalt Blue
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
      ...Platform.select({
        ios: {
          shadowColor: '#0063F7',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
        },
        android: {
          elevation: 8,
        },
        web: {
          boxShadow: '0 16px 36px -8px rgba(0, 99, 247, 0.45)',
        } as any,
      }),
    },
    title: {
      color: colors.textPrimary,
      fontSize: FONTS.sizes.xl,
      fontWeight: '800',
      letterSpacing: FONTS.metrics.headerTracking,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: FONTS.sizes.xs,
      fontWeight: '500',
      letterSpacing: FONTS.metrics.bodyTracking,
      marginTop: 4,
    },
    pinSection: {
      alignItems: 'center',
      marginVertical: SPACING.xl,
    },
    pinPrompt: {
      color: colors.textSecondary,
      fontSize: FONTS.sizes.sm,
      fontWeight: '600',
      letterSpacing: FONTS.metrics.bodyTracking,
      marginBottom: SPACING.xl,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: colors.surfaceBorder,
      backgroundColor: 'transparent',
    },
    dotFilled: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dotError: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    statusIndicator: {
      marginTop: SPACING.xs,
    },
    errorText: {
      color: colors.accent,
      fontSize: FONTS.sizes.xs,
      fontWeight: '700',
      letterSpacing: FONTS.metrics.bodyTracking,
      marginTop: SPACING.xs,
    },
    hintText: {
      color: colors.textMuted,
      fontSize: FONTS.sizes.xs - 1,
      letterSpacing: FONTS.metrics.bodyTracking,
      marginTop: SPACING.xs,
    },
    keypad: {
      gap: SPACING.md,
      maxWidth: 380,
      width: '100%',
      alignSelf: 'center',
    },
    keyRow: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    key: {
      flex: 1,
      height: 64,
      borderRadius: RADIUS.md, // 12px squircle
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    actionKey: {
      backgroundColor: colors.surfaceRaised,
    },
    keyText: {
      color: colors.textPrimary,
      fontSize: FONTS.sizes.xxl,
      fontWeight: '600',
      letterSpacing: FONTS.metrics.bodyTracking,
    },
    demoHelper: {
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    demoTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    demoPills: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    demoPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    demoPillText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
    },
  });
