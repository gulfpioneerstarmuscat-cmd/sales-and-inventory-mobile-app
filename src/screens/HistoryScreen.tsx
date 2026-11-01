import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';
import { Sale } from '../types';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

export const HistoryScreen: React.FC = () => {
  const { activeBranch, isAdmin } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'credit'>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    fetchSales();
  }, [activeBranch, isAdmin]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sales')
        .select(`
          *,
          items:sale_items(*)
        `)
        .order('created_at', { ascending: false });

      // If not admin, restrict to assigned branch
      if (!isAdmin) {
        query = query.eq('branch', activeBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSales((data as Sale[]) || []);
    } catch (e) {
      console.warn('Error fetching sales history', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.staff_name && s.staff_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'all' || s.payment_status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [sales, searchQuery, statusFilter]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={styles.container}>
      {/* Zone 1: Top Search Bar & Filter Pills */}
      <View style={styles.zone1}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice #, customer, staff..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'paid', 'credit'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                statusFilter === filter && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === filter && styles.filterPillTextActive,
                ]}
              >
                {filter === 'all' ? 'All Sales' : filter === 'paid' ? 'Paid Only' : 'Credit Only'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchSales}>
            <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Zone 2: Compact Quick-Glance Data Rows */}
      {loading ? (
        <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: 40 }} />
      ) : filteredSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No sales records found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: 110 }}
          renderItem={({ item }) => {
            const isCredit = item.payment_status === 'credit';
            return (
              <TouchableOpacity
                style={styles.saleRowCard}
                onPress={() => setSelectedSale(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
                    <View
                      style={[
                        styles.branchBadge,
                        item.branch === 'Al Khoudh' ? styles.branchKhoudh : styles.branchGhala,
                      ]}
                    >
                      <Text style={styles.branchBadgeText}>{item.branch}</Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerTitle} numberOfLines={1}>
                      {item.customer_name}
                    </Text>
                    <Text style={styles.staffMeta}>By: {item.staff_name}</Text>
                  </View>

                  <View style={styles.amountCol}>
                    <Text style={styles.totalAmountText}>
                      {item.total_amount.toFixed(3)} <Text style={styles.omrSub}>OMR</Text>
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        isCredit ? styles.statusPillCredit : styles.statusPillPaid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isCredit ? styles.statusCreditText : styles.statusPaidText,
                        ]}
                      >
                        {isCredit ? 'CREDIT' : item.payment_method?.toUpperCase() || 'PAID'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Dynamic Detail Modal (Itemized Parts & Breakdown) */}
      <Modal
        visible={!!selectedSale}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSale(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailInvoice}>{selectedSale?.invoice_number}</Text>
                <Text style={styles.detailDate}>{formatDate(selectedSale?.created_at)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSale(null)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Customer & Branch Details */}
              <View style={styles.detailInfoBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client:</Text>
                  <Text style={styles.detailValue}>{selectedSale?.customer_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Branch:</Text>
                  <Text style={styles.detailValue}>{selectedSale?.branch}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cashier:</Text>
                  <Text style={styles.detailValue}>{selectedSale?.staff_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment:</Text>
                  <Text style={styles.detailValue}>
                    {selectedSale?.payment_status === 'credit'
                      ? 'Credit (Pending Settlement)'
                      : `${selectedSale?.payment_method?.toUpperCase()} (Paid)`}
                  </Text>
                </View>
                {selectedSale?.payment_method === 'both' && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Split Math:</Text>
                    <Text style={styles.detailValue}>
                      Cash: {selectedSale.cash_paid.toFixed(3)} | Card: {selectedSale.card_paid.toFixed(3)}
                    </Text>
                  </View>
                )}
                {selectedSale?.notes ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.detailValue}>{selectedSale.notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* Itemized Parts List */}
              <Text style={styles.itemizedTitle}>PURCHASED LINE ITEMS</Text>
              <View style={styles.itemsCard}>
                {selectedSale?.items && selectedSale.items.length > 0 ? (
                  selectedSale.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemSku}>{item.sku}</Text>
                        <Text style={styles.itemName}>{item.product_name}</Text>
                        <Text style={styles.itemUnitPrice}>
                          {item.quantity} × {item.unit_price.toFixed(3)} OMR
                        </Text>
                      </View>
                      <Text style={styles.itemTotal}>
                        {item.total_price.toFixed(3)} OMR
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noItemsText}>Line items not available.</Text>
                )}
              </View>

              {/* Totals Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>{selectedSale?.subtotal.toFixed(3)} OMR</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Oman VAT ({((selectedSale?.vat_rate || 0) * 100).toFixed(0)}%):</Text>
                  <Text style={styles.summaryValue}>{selectedSale?.vat_amount.toFixed(3)} OMR</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.grandLabel}>GRAND TOTAL:</Text>
                  <Text style={styles.grandValue}>{selectedSale?.total_amount.toFixed(3)} OMR</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => setSelectedSale(null)}
            >
              <Text style={styles.returnBtnText}>← RETURN TO SALES LIST</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  zone1: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.xs,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  filterPillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  refreshBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
  },
  saleRowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  invoiceNum: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
  },
  branchBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  branchKhoudh: {
    backgroundColor: '#38BDF822',
  },
  branchGhala: {
    backgroundColor: '#A855F722',
  },
  branchBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  staffMeta: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  totalAmountText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
  },
  omrSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  statusPillPaid: {
    backgroundColor: '#10B98122',
  },
  statusPillCredit: {
    backgroundColor: '#F59E0B22',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusPaidText: {
    color: COLORS.success,
  },
  statusCreditText: {
    color: COLORS.warning,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailInvoice: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '900',
  },
  detailDate: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: SPACING.xs,
  },
  detailInfoBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  itemizedTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  itemsCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#33415544',
  },
  itemSku: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
  },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  itemUnitPrice: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  itemTotal: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
  },
  noItemsText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  summaryValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: 6,
  },
  grandLabel: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
  },
  grandValue: {
    color: COLORS.success,
    fontSize: FONTS.sizes.lg,
    fontWeight: '900',
  },
  returnBtn: {
    backgroundColor: COLORS.primary,
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
