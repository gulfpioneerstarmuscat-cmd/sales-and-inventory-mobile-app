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
      {/* Zone 1: Top Search Bar & Category Chips */}
      <View style={styles.zone1}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search SKU, gate motor, barrier, lock..."
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

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={{ gap: 6, paddingRight: SPACING.md }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
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
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchProducts}>
            <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Zone 2: Compact Quick-Glance Data Rows */}
      {loading ? (
        <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: 40 }} />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No matching products found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: 110 }}
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
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.skuText}>{item.sku}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                {/* Branch Stock Indicators */}
                <View style={styles.stockCol}>
                  <View style={styles.branchCountRow}>
                    <Text style={styles.branchLabel}>Khoudh:</Text>
                    <Text
                      style={[
                        styles.branchCount,
                        item.stock_al_khoudh <= item.min_stock_alert && styles.lowStockText,
                      ]}
                    >
                      {item.stock_al_khoudh} {item.unit}
                    </Text>
                  </View>
                  <View style={styles.branchCountRow}>
                    <Text style={styles.branchLabel}>Ghala:</Text>
                    <Text
                      style={[
                        styles.branchCount,
                        item.stock_ghala <= item.min_stock_alert && styles.lowStockText,
                      ]}
                    >
                      {item.stock_ghala} {item.unit}
                    </Text>
                  </View>
                  {isLow && (
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertText}>LOW STOCK</Text>
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Dynamic Master-Detail View Modal */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailSku}>{selectedProduct?.sku}</Text>
                <Text style={styles.detailTitle}>{selectedProduct?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedProduct(null)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Branch Stock Breakdown Cards */}
              <Text style={styles.sectionTitle}>BRANCH STOCK BREAKDOWN</Text>
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
                      <Text style={styles.currentPillText}>CURRENT BRANCH</Text>
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
                      <Text style={styles.currentPillText}>CURRENT BRANCH</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Technical Specifications */}
              <Text style={styles.sectionTitle}>TECHNICAL SPECIFICATIONS</Text>
              <View style={styles.specBox}>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Category:</Text>
                  <Text style={styles.specVal}>{selectedProduct?.category}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Unit of Sale:</Text>
                  <Text style={styles.specVal}>{selectedProduct?.unit}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Min Stock Alert:</Text>
                  <Text style={styles.specVal}>{selectedProduct?.min_stock_alert} units</Text>
                </View>
                {selectedProduct?.description ? (
                  <View style={[styles.specRow, { flexDirection: 'column', gap: 4, marginTop: 4 }]}>
                    <Text style={styles.specLabel}>Description:</Text>
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
                >
                  <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
                  <Text style={styles.transferStockText}>TRANSFER STOCK</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.returnBtn}
                onPress={() => setSelectedProduct(null)}
              >
                <Text style={styles.returnBtnText}>← RETURN TO CATALOG</Text>
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
  categoryScroll: {
    marginTop: SPACING.xs,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignSelf: 'center',
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
  productRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  skuText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
  },
  categoryBadge: {
    backgroundColor: '#334155AA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
  nameText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  stockCol: {
    alignItems: 'flex-end',
    minWidth: 90,
  },
  branchCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  branchLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  branchCount: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  lowStockText: {
    color: COLORS.warning,
  },
  alertBadge: {
    backgroundColor: '#F59E0B22',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 2,
  },
  alertText: {
    color: COLORS.warning,
    fontSize: 8,
    fontWeight: '900',
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
    maxHeight: '85%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  detailSku: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
  },
  detailTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginVertical: SPACING.sm,
  },
  stockCardsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  branchCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  activeBranchCard: {
    borderColor: COLORS.primary,
  },
  branchCardTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
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
  },
  currentPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  currentPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  specBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.xl,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
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
    gap: SPACING.sm,
  },
  transferStockBtn: {
    backgroundColor: COLORS.success,
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  transferStockText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  returnBtn: {
    backgroundColor: COLORS.surfaceLight,
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

