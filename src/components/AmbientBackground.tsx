import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface AmbientBackgroundProps {
  children?: React.ReactNode;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ children }) => {
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Base Linear Tech Gradient (Canvas) */}
      <LinearGradient
        colors={
          isDark
            ? ['#020617', '#0A1124', '#030712']
            : ['#F8FAFC', '#F0F9FF', '#EDF2F7']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Ambient Top-Right Cyan/Sky Tech Glow (gpsmuscat.com signature) */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(6, 182, 212, 0.12)', 'rgba(14, 165, 233, 0.05)', 'transparent']
            : ['rgba(14, 165, 233, 0.14)', 'rgba(56, 189, 248, 0.05)', 'transparent']
        }
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.55 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 3. Ambient Bottom-Left Cobalt Focal Glow */}
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(0, 99, 247, 0.07)', 'transparent']
            : ['transparent', 'rgba(0, 99, 247, 0.05)', 'transparent']
        }
        start={{ x: 0, y: 0.45 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
