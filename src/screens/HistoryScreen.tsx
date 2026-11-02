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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET, SHADOWS } from '../styles/theme';
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
      {/* Zone 1: Top Search Bar & Filter Chips (Unified with POS Screen) */}
      <View style={styles.zone1}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice #, customer, staff..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips & Refresh Action */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{ flex: 1 }}
          >
            {(['all', 'paid', 'credit'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterPill,
                  statusFilter === filter && styles.filterPillActive,
                ]}
                onPress={() => setStatusFilter(filter)}
                activeOpacity={0.7}
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
          </ScrollView>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchSales}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Zone 2: Header Row with Live Count */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>SALES RECORDS</Text>
          <Text style={styles.itemCount}>({filteredSales.length} records)</Text>
        </View>
        <Text style={styles.branchScopeText}>
          {isAdmin ? 'All Branches' : activeBranch}
        </Text>
      </View>

      {/* Zone 3: Compact Unified Data Rows */}
      {loading ? (
        <ActivityIndicator color={COLORS.primaryLight} style={{ marginVertical: 32 }} />
      ) : filteredSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="receipt-outline" size={32} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Sales Records Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try adjusting your search query or filters.' : 'Completed sales transactions will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isCredit = item.payment_status === 'credit';
            const isKhoudh = item.branch === 'Al Khoudh';

            return (
              <TouchableOpacity
                style={styles.saleRowCard}
                onPress={() => setSelectedSale(item)}
                activeOpacity={0.7}
              >
                {/* Line 1: Invoice # and Branch on Left, Date/Time on Right */}
                <View style={styles.cardLine1}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
                    <View
                      style={[
                        styles.branchPill,
                        isKhoudh ? styles.branchKhoudh : styles.branchGhala,
                      ]}
                    >
                      <Text style={[styles.branchPillText, isKhoudh ? styles.branchKhoudhText : styles.branchGhalaText]}>
                        {isKhoudh ? 'Al Khoud' : 'Ghala'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>

                {/* Line 2: Customer Name & Staff on Left, Amount & Status on Right */}
                <View style={styles.cardLine2}>
                  <View style={styles.customerInfoCol}>
                    <Text style={styles.customerTitle} numberOfLines={1}>
                      {item.customer_name}
                    </Text>
                    <Text style={styles.staffMeta} numberOfLines={1}>
                      By: {item.staff_name || 'Staff User'}
                    </Text>
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

      {/* Dynamic Detail Modal (Itemized Parts & Breakdown - Unified Layout) */}
      <Modal
        visible={!!selectedSale}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSale(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            {/* Modal Header */}
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailInvoice}>{selectedSale?.invoice_number}</Text>
                <Text style={styles.detailDate}>{formatDate(selectedSale?.created_at)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSale(null)}
                style={styles.closeModalBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Customer & Branch Information Card */}
              <View style={styles.detailInfoBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client:</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{selectedSale?.customer_name}</Text>
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
                  <Text style={[styles.detailValue, selectedSale?.payment_status === 'credit' && { color: COLORS.accent }]}>
                    {selectedSale?.payment_status === 'credit'
                      ? 'Credit (Pending Settlement)'
                      : `${selectedSale?.payment_method?.toUpperCase() || 'CASH'} (Paid)`}
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
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.detailValue}>{selectedSale.notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* Itemized Purchased Items Card */}
              <View style={styles.itemizedHeaderRow}>
                <Text style={styles.itemizedTitle}>PURCHASED LINE ITEMS</Text>
                <Text style={styles.itemCount}>({selectedSale?.items?.length || 0} items)</Text>
              </View>

              <View style={styles.itemsCard}>
                {selectedSale?.items && selectedSale.items.length > 0 ? (
                  selectedSale.items.map((item, idx) => (
                    <View key={idx} style={[styles.itemRow, idx === (selectedSale?.items?.length || 0) - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.itemSku}>{item.sku}</Text>
                        <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
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

              {/* Totals Summary Card (Matches POS totalsCard) */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{selectedSale?.subtotal.toFixed(3)} OMR</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Oman VAT ({((selectedSale?.vat_rate || 0) * 100).toFixed(0)}%)</Text>
                  <Text style={styles.summaryValue}>{selectedSale?.vat_amount.toFixed(3)} OMR</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.grandLabel}>GRAND TOTAL</Text>
                  <Text style={styles.grandValue}>{selectedSale?.total_amount.toFixed(3)} OMR</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => setSelectedSale(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.returnBtnText}>DISMISS</Text>
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
    paddingTop: SPACING.md,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    height: TOUCH_TARGET.inputHeight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.ambientCard,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    letterSpacing: FONTS.metrics.bodyTracking,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  filterPill: {
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(0, 99, 247, 0.6)',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 99, 247, 0.35)',
      } as any,
    }),
  },
  filterPillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
    lineHeight: 16,
  },
  itemCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  branchScopeText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 32,
    marginTop: 20,
    ...SHADOWS.ambientCard,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  saleRowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.ambientCard,
  },
  cardLine1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  invoiceNum: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  branchPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  branchKhoudh: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  branchGhala: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  branchPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  branchKhoudhText: {
    color: '#38BDF8',
  },
  branchGhalaText: {
    color: '#A855F7',
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  cardLine2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  customerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  staffMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  totalAmountText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  omrSub: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  statusPillPaid: {
    backgroundColor: COLORS.primaryMuted,
  },
  statusPillCredit: {
    backgroundColor: COLORS.accentMuted,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPaidText: {
    color: COLORS.primaryLight,
  },
  statusCreditText: {
    color: COLORS.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    borderTopWidth: 1,
    borderColor: COLORS.surfaceBorder,
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailInvoice: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  detailDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfoBox: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
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
  itemizedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemizedTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  itemsCard: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
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
    marginTop: 1,
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
    paddingVertical: 8,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
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
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  grandValue: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  returnBtn: {
    backgroundColor: COLORS.primary,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px -4px rgba(0, 99, 247, 0.45)',
      } as any,
    }),
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
