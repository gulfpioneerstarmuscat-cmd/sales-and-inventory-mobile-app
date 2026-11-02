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
import { Product } from '../types';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

interface InventoryScreenProps {
  onOpenTransfer?: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ onOpenTransfer }) => {
  const { activeBranch, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (e) {
      console.warn('Error fetching products', e);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Gate Motors', 'Boom Barriers', 'Access Control', 'Locks & Accessories', 'Spare Parts'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        selectedCategory === 'All' || p.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <View style={styles.container}>
      {/* Zone 1: Top Search Bar & Category Chips (Unified with POS Screen) */}
      <View style={styles.zone1}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search SKU, gate motor, barrier, lock..."
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

        {/* Category Filter Pills & Refresh */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{ flex: 1 }}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchProducts}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Zone 2: Header Row with Live Count and Quick Transfer CTA */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>INVENTORY PRODUCTS</Text>
          <Text style={styles.itemCount}>({filteredProducts.length} items)</Text>
        </View>
        {onOpenTransfer && (
          <TouchableOpacity
            style={styles.quickTransferBtn}
            onPress={onOpenTransfer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal" size={14} color={COLORS.primaryLight} />
            <Text style={styles.quickTransferText}>Transfer Stock</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Zone 3: Compact Unified Data Rows */}
      {loading ? (
        <ActivityIndicator color={COLORS.primaryLight} style={{ marginVertical: 32 }} />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cube-outline" size={32} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try searching by a different SKU or part name.' : 'Product inventory will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const currentStock =
              activeBranch === 'Al Khoudh' ? item.stock_al_khoudh : item.stock_ghala;
            const isLow = currentStock <= item.min_stock_alert;

            return (
              <TouchableOpacity
                style={styles.productRowCard}
                onPress={() => setSelectedProduct(item)}
                activeOpacity={0.7}
              >
                {/* Left Side: Product Details */}
                <View style={styles.productInfoCol}>
                  {/* Line 1: SKU on Left, Category Pill Inline */}
                  <View style={styles.skuRow}>
                    <Text style={styles.skuText}>{item.sku}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText} numberOfLines={1}>{item.category}</Text>
                    </View>
                    {isLow && (
                      <View style={styles.alertBadge}>
                        <Text style={styles.alertText}>LOW</Text>
                      </View>
                    )}
                  </View>

                  {/* Line 2: Product Name */}
                  <Text style={styles.nameText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                {/* Right Side: Branch Stock Counts & Chevron */}
                <View style={styles.stockCol}>
                  <View style={styles.stockPillGroup}>
                    <View style={[styles.branchStockPill, activeBranch === 'Al Khoudh' && styles.activeBranchStockPill]}>
                      <Text style={styles.branchStockLabel}>Khoud:</Text>
                      <Text
                        style={[
                          styles.branchStockValue,
                          item.stock_al_khoudh <= item.min_stock_alert && styles.lowStockText,
                        ]}
                      >
                        {item.stock_al_khoudh}
                      </Text>
                    </View>

                    <View style={[styles.branchStockPill, activeBranch === 'Ghala' && styles.activeBranchStockPill]}>
                      <Text style={styles.branchStockLabel}>Ghala:</Text>
                      <Text
                        style={[
                          styles.branchStockValue,
                          item.stock_ghala <= item.min_stock_alert && styles.lowStockText,
                        ]}
                      >
                        {item.stock_ghala}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Dynamic Master-Detail View Modal (Unified Layout) */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            {/* Modal Header */}
            <View style={styles.detailHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.detailSku}>{selectedProduct?.sku}</Text>
                <Text style={styles.detailTitle} numberOfLines={2}>{selectedProduct?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedProduct(null)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Branch Stock Breakdown Cards */}
              <Text style={styles.detailSectionTitle}>BRANCH STOCK BREAKDOWN</Text>
              <View style={styles.stockCardsRow}>
                <View
                  style={[
                    styles.branchCard,
                    activeBranch === 'Al Khoudh' && styles.activeBranchCard,
                  ]}
                >
                  <Text style={styles.branchCardTitle}>AL KHOUDH</Text>
                  <Text style={styles.branchCardQty}>
                    {selectedProduct?.stock_al_khoudh || 0}{' '}
                    <Text style={styles.unitSub}>{selectedProduct?.unit}</Text>
                  </Text>
                  {activeBranch === 'Al Khoudh' && (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>ACTIVE BRANCH</Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.branchCard,
                    activeBranch === 'Ghala' && styles.activeBranchCard,
                  ]}
                >
                  <Text style={styles.branchCardTitle}>GHALA</Text>
                  <Text style={styles.branchCardQty}>
                    {selectedProduct?.stock_ghala || 0}{' '}
                    <Text style={styles.unitSub}>{selectedProduct?.unit}</Text>
                  </Text>
                  {activeBranch === 'Ghala' && (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>ACTIVE BRANCH</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Technical Specifications Box */}
              <Text style={styles.detailSectionTitle}>TECHNICAL SPECIFICATIONS</Text>
              <View style={styles.specBox}>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Category</Text>
                  <Text style={styles.specVal}>{selectedProduct?.category}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Unit of Sale</Text>
                  <Text style={styles.specVal}>{selectedProduct?.unit}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Min Stock Alert</Text>
                  <Text style={[styles.specVal, { color: COLORS.accent }]}>
                    {selectedProduct?.min_stock_alert} units
                  </Text>
                </View>
                {selectedProduct?.description ? (
                  <View style={[styles.specRow, { flexDirection: 'column', gap: 4, marginTop: 4, borderBottomWidth: 0 }]}>
                    <Text style={styles.specLabel}>Description</Text>
                    <Text style={styles.specDesc}>{selectedProduct.description}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.detailFooter}>
              {onOpenTransfer && (
                <TouchableOpacity
                  style={styles.transferStockBtn}
                  onPress={() => {
                    setSelectedProduct(null);
                    onOpenTransfer();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
                  <Text style={styles.transferStockText}>TRANSFER STOCK</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.returnBtn}
                onPress={() => setSelectedProduct(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.returnBtnText}>DISMISS</Text>
              </TouchableOpacity>
            </View>
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
  categoryChip: {
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(0, 99, 247, 0.6)',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 99, 247, 0.35)',
      } as any,
    }),
  },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  categoryTextActive: {
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
  quickTransferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.primaryMuted,
  },
  quickTransferText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
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
  productRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.ambientCard,
  },
  productInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  skuText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: COLORS.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  alertBadge: {
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nameText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    letterSpacing: FONTS.metrics.headerTracking,
    marginTop: 2,
  },
  stockCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockPillGroup: {
    flexDirection: 'column',
    gap: 3,
    alignItems: 'flex-end',
  },
  branchStockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBranchStockPill: {
    borderWidth: 1,
    borderColor: 'rgba(0, 99, 247, 0.4)',
    backgroundColor: 'rgba(0, 99, 247, 0.08)',
  },
  branchStockLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  branchStockValue: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  lowStockText: {
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
  detailSku: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    letterSpacing: FONTS.metrics.headerTracking,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
    marginBottom: 8,
    marginTop: 4,
  },
  stockCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  branchCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  activeBranchCard: {
    borderColor: 'rgba(0, 99, 247, 0.6)',
    backgroundColor: 'rgba(0, 99, 247, 0.08)',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 99, 247, 0.25)',
      } as any,
    }),
  },
  branchCardTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  branchCardQty: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    marginVertical: 4,
  },
  unitSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  currentPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  currentPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  specBox: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 14,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  specLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  specVal: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  specDesc: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    lineHeight: 18,
  },
  detailFooter: {
    gap: 8,
  },
  transferStockBtn: {
    backgroundColor: COLORS.primary,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px -4px rgba(0, 99, 247, 0.45)',
      } as any,
    }),
  },
  transferStockText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  returnBtn: {
    backgroundColor: COLORS.surfaceRaised,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  returnBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
