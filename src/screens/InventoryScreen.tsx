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
import { SPACING, FONTS, RADIUS, TOUCH_TARGET, ThemeColors, getShadows } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { Product } from '../types';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

interface InventoryScreenProps {
  onOpenTransfer?: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ onOpenTransfer }) => {
  const { colors, isDark, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark, shadows), [colors, isDark, shadows]);
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
          <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search SKU, gate motor, barrier, lock..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
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
            <Ionicons name="swap-horizontal" size={14} color={colors.primaryLight} />
            <Text style={styles.quickTransferText}>Transfer Stock</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Zone 3: Compact Unified Data Rows */}
      {loading ? (
        <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: 32 }} />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
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

                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
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
                <Ionicons name="close" size={22} color={colors.textSecondary} />
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
                  <Text style={[styles.specVal, { color: colors.accent }]}>
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

const createStyles = (colors: ThemeColors, isDark: boolean, shadows: ReturnType<typeof getShadows>) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  zone1: {
    paddingTop: SPACING.md,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    height: TOUCH_TARGET.inputHeight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.ambientCard,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: 'rgba(0, 99, 247, 0.6)',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 99, 247, 0.35)',
      } as any,
    }),
  },
  categoryText: {
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
    lineHeight: 16,
  },
  itemCount: {
    color: colors.textMuted,
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
    backgroundColor: colors.primaryMuted,
  },
  quickTransferText: {
    color: colors.primaryLight,
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
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 32,
    marginTop: 20,
    ...shadows.ambientCard,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  productRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.ambientCard,
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
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  alertBadge: {
    backgroundColor: colors.accentMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nameText: {
    color: colors.textPrimary,
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
    backgroundColor: colors.surfaceRaised,
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
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  branchStockValue: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  lowStockText: {
    color: colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailSku: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailTitle: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    letterSpacing: FONTS.metrics.headerTracking,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSectionTitle: {
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  branchCardQty: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    marginVertical: 4,
  },
  unitSub: {
    fontSize: FONTS.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  currentPill: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
    color: colors.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  specVal: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  specDesc: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
    lineHeight: 18,
  },
  detailFooter: {
    gap: 8,
  },
  transferStockBtn: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surfaceRaised,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  returnBtnText: {
    color: colors.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  });
