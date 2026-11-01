import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { TabScreen } from '../components/FloatingNavBar';
import { supabase } from '../config/supabase';

interface HomeScreenProps {
  onNavigate: (tab: TabScreen) => void;
  onOpenTransfer: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenTransfer,
}) => {
  const { currentUser, activeBranch, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    todaySalesCount: 0,
    todaySalesTotal: 0,
    lowStockCount: 0,
    totalProducts: 20,
  });

  useEffect(() => {
    fetchQuickStats();
  }, [activeBranch]);

  const fetchQuickStats = async () => {
    try {
      // 1. Fetch today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, branch')
        .gte('created_at', `${today}T00:00:00Z`);

      const filteredSales = (salesData || []).filter(
        (s) => isAdmin || s.branch === activeBranch
      );

      const totalOMR = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

      // 2. Fetch products count and low stock
      const { data: prodData } = await supabase.from('products').select('*');
      const prods = prodData || [];
      const lowStock = prods.filter((p) => {
        const stock = activeBranch === 'Al Khoudh' ? p.stock_al_khoudh : p.stock_ghala;
        return stock <= p.min_stock_alert;
      });

      setStats({
        todaySalesCount: filteredSales.length,
        todaySalesTotal: totalOMR,
        lowStockCount: lowStock.length,
        totalProducts: prods.length,
      });
    } catch (e) {
      console.warn('Error fetching home stats', e);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 110, paddingTop: SPACING.md }}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Banner */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeTextCol}>
          <Text style={styles.welcomeGreeting}>WELCOME BACK,</Text>
          <Text style={styles.welcomeStaffName}>{currentUser?.name || 'Staff'}</Text>
          <View style={styles.branchStatusPill}>
            <View
              style={[
                styles.branchDot,
                { backgroundColor: activeBranch === 'Al Khoudh' ? COLORS.branchKhoudh : COLORS.branchGhala },
              ]}
            />
            <Text style={styles.branchStatusText}>
              Logged into <Text style={{ fontWeight: '800' }}>{activeBranch}</Text> Showroom
            </Text>
          </View>
        </View>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{currentUser?.role?.toUpperCase() || 'STAFF'}</Text>
        </View>
      </View>

      {/* Primary Action Button (Launch POS) */}
      <TouchableOpacity
        style={styles.launchPosBtn}
        onPress={() => onNavigate('pos')}
        activeOpacity={0.8}
      >
        <View style={styles.posBtnIcon}>
          <Ionicons name="cart" size={28} color="#FFFFFF" />
        </View>
        <View style={styles.posBtnTextCol}>
          <Text style={styles.posBtnTitle}>OPEN B2B POS</Text>
          <Text style={styles.posBtnSubtitle}>New sale, dynamic pricing & credit receipt</Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Quick Action Tiles */}
      <Text style={styles.sectionTitle}>OPERATIONAL SHORTCUTS</Text>
      <View style={styles.shortcutGrid}>
        <TouchableOpacity
          style={styles.shortcutTile}
          onPress={() => onNavigate('inventory')}
          activeOpacity={0.7}
        >
          <View style={[styles.tileIconBadge, { backgroundColor: '#38BDF822' }]}>
            <Ionicons name="cube-outline" size={24} color={COLORS.branchKhoudh} />
          </View>
          <Text style={styles.tileTitle}>Stock Catalog</Text>
          <Text style={styles.tileDesc}>Check live inventory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutTile}
          onPress={() => onNavigate('history')}
          activeOpacity={0.7}
        >
          <View style={[styles.tileIconBadge, { backgroundColor: '#10B98122' }]}>
            <Ionicons name="receipt-outline" size={24} color={COLORS.success} />
          </View>
          <Text style={styles.tileTitle}>Sales History</Text>
          <Text style={styles.tileDesc}>Inspect past invoices</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutTile}
          onPress={onOpenTransfer}
          activeOpacity={0.7}
        >
          <View style={[styles.tileIconBadge, { backgroundColor: '#A855F722' }]}>
            <Ionicons name="swap-horizontal" size={24} color={COLORS.branchGhala} />
          </View>
          <Text style={styles.tileTitle}>Stock Transfer</Text>
          <Text style={styles.tileDesc}>Move stock inter-branch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutTile}
          onPress={fetchQuickStats}
          activeOpacity={0.7}
        >
          <View style={[styles.tileIconBadge, { backgroundColor: '#F59E0B22' }]}>
            <Ionicons name="sync-outline" size={24} color={COLORS.warning} />
          </View>
          <Text style={styles.tileTitle}>Sync Data</Text>
          <Text style={styles.tileDesc}>Refresh Supabase slot</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Performance Cards */}
      <Text style={styles.sectionTitle}>TODAY'S SHIFT SUMMARY</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today's Invoices</Text>
          <Text style={styles.statVal}>{stats.todaySalesCount}</Text>
          <Text style={styles.statSub}>{activeBranch} branch</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Sales Volume</Text>
          <Text style={[styles.statVal, { color: COLORS.success }]}>
            {stats.todaySalesTotal.toFixed(3)}
          </Text>
          <Text style={styles.statSub}>OMR recorded</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Low Stock Alerts</Text>
          <Text
            style={[
              styles.statVal,
              stats.lowStockCount > 0 ? { color: COLORS.warning } : null,
            ]}
          >
            {stats.lowStockCount}
          </Text>
          <Text style={styles.statSub}>Needs replenishment</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.md,
  },
  welcomeTextCol: {
    flex: 1,
  },
  welcomeGreeting: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  welcomeStaffName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '900',
    marginTop: 2,
  },
  branchStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  branchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  branchStatusText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  roleTag: {
    backgroundColor: '#3B82F633',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleTagText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
  },
  launchPosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
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
  posBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFFFFF22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  posBtnTextCol: {
    flex: 1,
  },
  posBtnTitle: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  posBtnSubtitle: {
    color: '#FFFFFFCC',
    fontSize: FONTS.sizes.xs - 1,
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  shortcutTile: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    minHeight: 100,
    justifyContent: 'center',
  },
  tileIconBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tileTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  tileDesc: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  statVal: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '900',
    marginVertical: 4,
  },
  statSub: {
    color: COLORS.textSecondary,
    fontSize: 9,
    textAlign: 'center',
  },
});

