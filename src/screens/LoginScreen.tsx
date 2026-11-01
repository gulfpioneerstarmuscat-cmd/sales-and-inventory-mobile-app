import React, { useState } from 'react';
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
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { loginWithPin } = useAuth();
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
    <View style={[styles.container, { paddingTop: insets.top + SPACING.xl, paddingBottom: insets.bottom + SPACING.lg }]}>
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
          <ActivityIndicator color={COLORS.primaryLight} style={styles.statusIndicator} />
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
                    if (k === 'C') handleClear();
                    else if (k === '⌫') handleBackspace();
                    else handleDigit(k);
                  }}
                  activeOpacity={0.6}
                  disabled={loading}
                >
                  {k === '⌫' ? (
                    <Ionicons name="backspace-outline" size={26} color={COLORS.textPrimary} />
                  ) : (
                    <Text style={styles.keyText}>{k}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Quick Demo Pins Helper */}
      <View style={styles.demoHelper}>
        <Text style={styles.demoTitle}>Quick Access PINs:</Text>
        <View style={styles.demoPills}>
          <TouchableOpacity style={styles.demoPill} onPress={() => handleDigit('1')}>
            <Text style={styles.demoPillText}>Admin: 1234</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoPill} onPress={() => handleDigit('5')}>
            <Text style={styles.demoPillText}>Khoudh: 5678</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoPill} onPress={() => handleDigit('5')}>
            <Text style={styles.demoPillText}>Ghala: 5679</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  pinSection: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  pinPrompt: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  dotError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger,
  },
  statusIndicator: {
    marginTop: SPACING.xs,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  hintText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs - 1,
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
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  actionKey: {
    backgroundColor: COLORS.surfaceLight,
  },
  keyText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
  },
  demoHelper: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  demoTitle: {
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  demoPillText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
});

