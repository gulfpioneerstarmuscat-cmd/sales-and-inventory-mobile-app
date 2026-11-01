import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';
import { Product, Branch } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { currentUser, activeBranch, isAdmin } = useAuth();
  const [fromBranch, setFromBranch] = useState<Branch>('Al Khoudh');
  const [toBranch, setToBranch] = useState<Branch>('Ghala');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProds, setLoadingProds] = useState(false);

  useEffect(() => {
    if (visible) {
      // Set initial directional branches
      if (isAdmin) {
        setFromBranch('Al Khoudh');
        setToBranch('Ghala');
      } else {
        const staffBr = activeBranch;
        setFromBranch(staffBr);
        setToBranch(staffBr === 'Al Khoudh' ? 'Ghala' : 'Al Khoudh');
      }
      fetchProducts();
    }
  }, [visible, activeBranch, isAdmin]);

  const fetchProducts = async () => {
    try {
      setLoadingProds(true);
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) {
        setProducts(data as Product[]);
        setSelectedProduct(data[0] as Product);
      }
    } catch (e) {
      console.warn('Error fetching products for transfer', e);
    } finally {
      setLoadingProds(false);
    }
  };

  const handleToggleDirection = () => {
    if (isAdmin) {
      const prevFrom = fromBranch;
      setFromBranch(toBranch);
      setToBranch(prevFrom);
    }
  };

  const currentAvailableStock = selectedProduct
    ? fromBranch === 'Al Khoudh'
      ? selectedProduct.stock_al_khoudh
      : selectedProduct.stock_ghala
    : 0;

  const handleExecuteTransfer = async () => {
    if (!selectedProduct) {
      Alert.alert('Select Product', 'Please choose a product to transfer.');
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive quantity.');
      return;
    }

    if (qtyNum > currentAvailableStock) {
      Alert.alert(
        'Insufficient Stock',
        `Only ${currentAvailableStock} units available in ${fromBranch}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const itemsPayload = [
        {
          product_id: selectedProduct.id,
          sku: selectedProduct.sku,
          product_name: selectedProduct.name,
          quantity: qtyNum,
        },
      ];

      const { data, error } = await supabase.rpc('process_interbranch_transfer', {
        p_from_branch: fromBranch,
        p_to_branch: toBranch,
        p_staff_id: currentUser?.id || null,
        p_staff_name: currentUser?.name || 'Staff User',
        p_notes: notes || null,
        p_items: itemsPayload,
      });

      if (error) throw error;

      Alert.alert(
        'Transfer Completed!',
        `Successfully moved ${qtyNum} units of "${selectedProduct.name}" from ${fromBranch} to ${toBranch}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Transfer Error', err.message || 'Failed to complete transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="swap-horizontal" size={22} color={COLORS.success} />
              <Text style={styles.title}>INTER-BRANCH STOCK TRANSFER</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Directional Toggle Box */}
            <View style={styles.directionBox}>
              <View style={styles.branchEndpoint}>
                <Text style={styles.endpointLabel}>SENDER</Text>
                <Text style={styles.endpointName}>{fromBranch}</Text>
              </View>

              <TouchableOpacity
                style={[styles.switchDirectionBtn, !isAdmin && styles.switchBtnDisabled]}
                onPress={handleToggleDirection}
                disabled={!isAdmin}
              >
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={isAdmin ? COLORS.primaryLight : COLORS.textMuted}
                />
              </TouchableOpacity>

              <View style={styles.branchEndpoint}>
                <Text style={styles.endpointLabel}>RECEIVER</Text>
                <Text style={styles.endpointName}>{toBranch}</Text>
              </View>
            </View>
            {!isAdmin && (
              <Text style={styles.staffLockedNotice}>
                Staff transfers locked to current active branch ({fromBranch}).
              </Text>
            )}

            {/* Select Product */}
            <Text style={styles.inputLabel}>SELECT PRODUCT</Text>
            {loadingProds ? (
              <ActivityIndicator color={COLORS.primaryLight} style={{ marginVertical: 10 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.prodsScroll}
                contentContainerStyle={{ gap: 8 }}
              >
                {products.map((prod) => {
                  const isSelected = selectedProduct?.id === prod.id;
                  const senderStock =
                    fromBranch === 'Al Khoudh' ? prod.stock_al_khoudh : prod.stock_ghala;
                  return (
                    <TouchableOpacity
                      key={prod.id}
                      style={[styles.prodSelectCard, isSelected && styles.prodSelectCardActive]}
                      onPress={() => setSelectedProduct(prod)}
                    >
                      <Text style={styles.prodCardSku}>{prod.sku}</Text>
                      <Text style={styles.prodCardName} numberOfLines={2}>
                        {prod.name}
                      </Text>
                      <Text style={styles.prodCardStock}>
                        Avail in {fromBranch}: {senderStock}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Quantity */}
            <View style={styles.qtyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>QUANTITY TO TRANSFER</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={styles.availableStockBadge}>
                <Text style={styles.availableLabel}>Available in {fromBranch}</Text>
                <Text style={styles.availableVal}>{currentAvailableStock} units</Text>
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.inputLabel}>TRANSFER REASON / VAN NOTES</Text>
            <TextInput
              style={styles.notesField}
              placeholder="e.g. Replenishing Ghala showroom gate motors..."
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleExecuteTransfer}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>
                EXECUTE STOCK TRANSFER ({quantity} {selectedProduct?.unit || 'units'})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  directionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginVertical: SPACING.sm,
  },
  branchEndpoint: {
    flex: 1,
    alignItems: 'center',
  },
  endpointLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  endpointName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
    marginTop: 2,
  },
  switchDirectionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  switchBtnDisabled: {
    opacity: 0.5,
  },
  staffLockedNotice: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  prodsScroll: {
    marginBottom: SPACING.md,
  },
  prodSelectCard: {
    width: 160,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  prodSelectCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#3B82F611',
  },
  prodCardSku: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
  },
  prodCardName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    marginVertical: 4,
  },
  prodCardStock: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.background,
    height: TOUCH_TARGET.inputHeight,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    paddingHorizontal: SPACING.md,
  },
  availableStockBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    height: TOUCH_TARGET.inputHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  availableLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  availableVal: {
    color: COLORS.success,
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
  },
  notesField: {
    backgroundColor: COLORS.background,
    height: 48,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },
  confirmBtn: {
    backgroundColor: COLORS.success,
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

