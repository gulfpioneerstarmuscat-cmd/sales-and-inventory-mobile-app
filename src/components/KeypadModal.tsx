import React, { useState, useEffect } from 'react';
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

interface KeypadModalProps {
  visible: boolean;
  title: string;
  initialValue: string;
  suffix?: string;
  isDecimal?: boolean;
  onConfirm: (val: string) => void;
  onClose: () => void;
}

export const KeypadModal: React.FC<KeypadModalProps> = ({
  visible,
  title,
  initialValue,
  suffix = '',
  isDecimal = false,
  onConfirm,
  onClose,
}) => {
  const [val, setVal] = useState(initialValue || '0');

  useEffect(() => {
    if (visible) {
      setVal(initialValue || (isDecimal ? '0.000' : '1'));
    }
  }, [visible, initialValue, isDecimal]);

  const handleDigit = (digit: string) => {
    if (val === '0' || val === '0.000') {
      setVal(digit);
    } else {
      setVal((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (val.length <= 1) {
      setVal('0');
    } else {
      setVal((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setVal('0');
  };

  const handleDecimal = () => {
    if (!val.includes('.')) {
      setVal((prev) => prev + '.');
    }
  };

  const handleConfirm = () => {
    onConfirm(val);
    onClose();
  };

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [isDecimal ? '.' : 'C', '0', '⌫'],
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Value Display */}
              <View style={styles.displayContainer}>
                <Text style={styles.displayText}>
                  {val} <Text style={styles.suffix}>{suffix}</Text>
                </Text>
              </View>

              {/* Keypad Grid */}
              <View style={styles.grid}>
                {buttons.map((row, rIdx) => (
                  <View key={rIdx} style={styles.row}>
                    {row.map((btn, cIdx) => {
                      const isAction = btn === '⌫' || btn === 'C' || btn === '.';
                      return (
                        <TouchableOpacity
                          key={cIdx}
                          style={[styles.key, isAction && styles.actionKey]}
                          onPress={() => {
                            if (btn === '⌫') handleBackspace();
                            else if (btn === 'C') handleClear();
                            else if (btn === '.') handleDecimal();
                            else handleDigit(btn);
                          }}
                          activeOpacity={0.6}
                        >
                          {btn === '⌫' ? (
                            <Ionicons name="backspace-outline" size={24} color={COLORS.textPrimary} />
                          ) : (
                            <Text style={styles.keyText}>{btn}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmText}>CONFIRM & APPLY</Text>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    paddingBottom: SPACING.massive,
    borderTopWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  displayContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  displayText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.giant,
    fontWeight: '900',
  },
  suffix: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  grid: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  key: {
    flex: 1,
    height: 60,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#47556955',
  },
  actionKey: {
    backgroundColor: '#334155AA',
  },
  keyText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
