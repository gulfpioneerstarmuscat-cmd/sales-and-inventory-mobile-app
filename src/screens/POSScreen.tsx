import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, TOUCH_TARGET } from '../styles/theme';
import { Product, Customer, CartItem, PaymentMethod, PaymentStatus } from '../types';
import { KeypadModal } from '../components/KeypadModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

interface POSScreenProps {
  posPage: 1 | 2;
  setPosPage: (page: 1 | 2) => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onSaleCompleted?: () => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({
  posPage,
  setPosPage,
  cart,
  setCart,
  onSaleCompleted,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { activeBranch, currentUser } = useAuth();

  // Products & Customers State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Customer Badge Selection
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Keypad Modal State
  const [keypadVisible, setKeypadVisible] = useState(false);
  const [keypadTarget, setKeypadTarget] = useState<{
    productId: string;
    type: 'qty' | 'price';
    currentVal: string;
  } | null>(null);

  // POS Page 2 (Zone 4) States
  const [applyVat, setApplyVat] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashPaidInput, setCashPaidInput] = useState('');
  const [cardPaidInput, setCardPaidInput] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Products & Customers from Supabase
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);
      const [prodRes, custRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
      ]);

      if (prodRes.data && prodRes.data.length > 0) {
        setProducts(prodRes.data as Product[]);
      }
      if (custRes.data && custRes.data.length > 0) {
        setCustomers(custRes.data as Customer[]);
        // Default customer: Walk-in or first
        const defaultCust = custRes.data.find((c: Customer) => c.name.toLowerCase().includes('walk-in')) || custRes.data[0];
        setSelectedCustomer(defaultCust);
      }
    } catch (e) {
      console.warn('Error fetching Supabase data', e);
    } finally {
      setLoadingData(false);
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  }, [cart]);

  const vatRate = applyVat ? 0.05 : 0.0;
  const vatAmount = subtotal * vatRate;
  const totalAmount = subtotal + vatAmount;

  // Auto-balance Split Payment when total or method changes
  useEffect(() => {
    if (paymentMethod === 'both' && paymentStatus === 'paid') {
      const half = (totalAmount / 2).toFixed(3);
      setCashPaidInput(half);
      setCardPaidInput((totalAmount - parseFloat(half)).toFixed(3));
    } else if (paymentMethod === 'cash') {
      setCashPaidInput(totalAmount.toFixed(3));
      setCardPaidInput('0.000');
    } else if (paymentMethod === 'card') {
      setCashPaidInput('0.000');
      setCardPaidInput(totalAmount.toFixed(3));
    }
  }, [paymentMethod, paymentStatus, totalAmount]);

  const handleCashChange = (valStr: string) => {
    setCashPaidInput(valStr);
    const parsed = parseFloat(valStr) || 0;
    const remaining = Math.max(0, totalAmount - parsed);
    setCardPaidInput(remaining.toFixed(3));
  };

  const handleCardChange = (valStr: string) => {
    setCardPaidInput(valStr);
    const parsed = parseFloat(valStr) || 0;
    const remaining = Math.max(0, totalAmount - parsed);
    setCashPaidInput(remaining.toFixed(3));
  };

  // Cart Management
  const handleAddToCart = (product: Product) => {
    const branchStock = activeBranch === 'Al Khoudh' ? product.stock_al_khoudh : product.stock_ghala;
    if (branchStock <= 0) {
      Alert.alert('Out of Stock', `"${product.name}" has 0 stock at ${activeBranch} branch.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= branchStock) {
          Alert.alert('Max Stock Reached', `Only ${branchStock} units available at ${activeBranch}.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price,
              }
            : item
        );
      } else {
        // Add new item with default unit price 0.000 (ready for negotiated inline entry)
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unit_price: 0.0,
            total_price: 0.0,
          },
        ];
      }
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleOpenKeypad = (productId: string, type: 'qty' | 'price', currentVal: number) => {
    setKeypadTarget({
      productId,
      type,
      currentVal: type === 'price' ? currentVal.toFixed(3) : currentVal.toString(),
    });
    setKeypadVisible(true);
  };

  const handleConfirmKeypad = (valStr: string) => {
    if (!keypadTarget) return;
    const { productId, type } = keypadTarget;
    const num = parseFloat(valStr) || 0;

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          if (type === 'qty') {
            const branchStock =
              activeBranch === 'Al Khoudh'
                ? item.product.stock_al_khoudh
                : item.product.stock_ghala;
            const validQty = Math.max(1, Math.min(Math.floor(num), branchStock));
            return {
              ...item,
              quantity: validQty,
              total_price: validQty * item.unit_price,
            };
          } else {
            // Price update
            return {
              ...item,
              unit_price: num,
              total_price: item.quantity * num,
            };
          }
        }
        return item;
      })
    );
  };

  // Submit Sale & Atomic RPC Call
  const handleCheckoutSale = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Add items before saving the sale.');
      return;
    }

    // Check for unpriced items
    const hasZeroPrice = cart.some((item) => item.unit_price <= 0);
    if (hasZeroPrice) {
      Alert.alert(
        'Missing Negotiated Price',
        'One or more items have 0.000 OMR price. Please enter the agreed B2B unit price.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const itemsPayload = cart.map((item) => ({
        product_id: item.product.id,
        sku: item.product.sku,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { data, error } = await supabase.rpc('process_b2b_sale', {
        p_branch: activeBranch,
        p_customer_id: selectedCustomer?.id || null,
        p_customer_name: selectedCustomer?.company_name || selectedCustomer?.name || 'Walk-in Client',
        p_staff_id: currentUser?.id || null,
        p_staff_name: currentUser?.name || 'Staff User',
        p_subtotal: subtotal,
        p_vat_rate: vatRate,
        p_vat_amount: vatAmount,
        p_total_amount: totalAmount,
        p_payment_status: paymentStatus,
        p_payment_method: paymentStatus === 'paid' ? paymentMethod : null,
        p_cash_paid: paymentStatus === 'paid' ? parseFloat(cashPaidInput) || 0 : 0,
        p_card_paid: paymentStatus === 'paid' ? parseFloat(cardPaidInput) || 0 : 0,
        p_notes: saleNotes || null,
        p_items: itemsPayload,
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Sale Saved Successfully!',
        `Invoice #${data?.invoice_number || 'OK'} generated and stock decremented at ${activeBranch}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setPosPage(1);
              fetchInitialData();
              if (onSaleCompleted) onSaleCompleted();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Transaction Failed', err.message || 'Error processing sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const categories = ['All', 'Gate Motors', 'Boom Barriers', 'Access Control', 'Locks & Accessories', 'Spare Parts'];

  // =========================================================================
  // RENDER: ZONE 1 - 3 (POS PAGE 1)
  // =========================================================================
  const renderItemBuilder = () => (
    <View style={styles.builderContainer}>
      {/* Zone 1: Collapsible Customer Badge */}
      <View style={styles.zone1Container}>
        <TouchableOpacity
          style={styles.customerBadge}
          onPress={() => setCustomerPickerOpen(!customerPickerOpen)}
          activeOpacity={0.8}
        >
          <View style={styles.customerIcon}>
            <Ionicons name="business" size={18} color={COLORS.primaryLight} />
          </View>
          <View style={styles.customerTextCol}>
            <Text style={styles.customerLabel}>B2B CLIENT / CONTRACTOR</Text>
            <Text style={styles.customerName}>
              {selectedCustomer?.company_name || selectedCustomer?.name || 'Select Customer...'}
            </Text>
          </View>
          <Ionicons
            name={customerPickerOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {/* Collapsible Customer Picker Dropdown */}
        {customerPickerOpen && (
          <View style={styles.customerDropdown}>
            <View style={styles.custSearchRow}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.custSearchInput}
                placeholder="Search contractor or installer..."
                placeholderTextColor={COLORS.textMuted}
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
            </View>
            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
              {customers
                .filter((c) =>
                  (c.company_name || c.name)
                    .toLowerCase()
                    .includes(customerSearch.toLowerCase())
                )
                .map((cust) => (
                  <TouchableOpacity
                    key={cust.id}
                    style={styles.custRow}
                    onPress={() => {
                      setSelectedCustomer(cust);
                      setCustomerPickerOpen(false);
                    }}
                  >
                    <Text style={styles.custRowTitle}>
                      {cust.company_name ? `${cust.company_name} (${cust.name})` : cust.name}
                    </Text>
                    {cust.current_balance ? (
                      <Text style={styles.custBalance}>Bal: {cust.current_balance.toFixed(3)} OMR</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Zone 2: Product Quick Search Bar & Category Chips */}
      <View style={styles.zone2Container}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gate motor, remote, SKU..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 6 }}
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
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Zone 3: Item Tray (Available Catalog + Active Builder Line Items) */}
      <View style={styles.zone3Container}>
        {/* Selected Cart Items Tray Header */}
        <View style={styles.trayHeader}>
          <Text style={styles.trayTitle}>
            SALE ITEMS ({cart.length})
          </Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={() => setCart([])}>
              <Text style={styles.clearCartText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cart Line Items (With Inline Quantity & Dynamic B2B Price) */}
        {cart.length > 0 && (
          <View style={styles.cartItemsList}>
            {cart.map((item) => (
              <View key={item.product.id} style={styles.cartRowCard}>
                <View style={styles.cartRowInfo}>
                  <Text style={styles.cartRowSku}>{item.product.sku}</Text>
                  <Text style={styles.cartRowName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                </View>

                {/* Inline Qty Box */}
                <TouchableOpacity
                  style={styles.inlineQtyBox}
                  onPress={() => handleOpenKeypad(item.product.id, 'qty', item.quantity)}
                >
                  <Text style={styles.qtyLabel}>QTY</Text>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                </TouchableOpacity>

                {/* Inline B2B Price Box */}
                <TouchableOpacity
                  style={[
                    styles.inlinePriceBox,
                    item.unit_price <= 0 && styles.priceBoxMissing,
                  ]}
                  onPress={() => handleOpenKeypad(item.product.id, 'price', item.unit_price)}
                >
                  <Text style={styles.priceLabel}>PRICE (OMR)</Text>
                  <Text style={styles.priceValue}>
                    {item.unit_price > 0 ? item.unit_price.toFixed(3) : 'SET PRICE'}
                  </Text>
                </TouchableOpacity>

                {/* Row Subtotal & Delete */}
                <View style={styles.cartRowTotalCol}>
                  <Text style={styles.rowTotalValue}>
                    {item.total_price.toFixed(3)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveFromCart(item.product.id)}
                    style={styles.deleteRowBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Catalog Search Results Grid */}
        <Text style={styles.catalogHeader}>CATALOG PRODUCTS</Text>
        {loadingData ? (
          <ActivityIndicator color={COLORS.primaryLight} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            scrollEnabled={!isTablet}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => {
              const stock =
                activeBranch === 'Al Khoudh' ? item.stock_al_khoudh : item.stock_ghala;
              const inCart = cart.find((c) => c.product.id === item.id);

              return (
                <TouchableOpacity
                  style={[styles.catalogCard, inCart && styles.catalogCardInCart]}
                  onPress={() => handleAddToCart(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogSku}>{item.sku}</Text>
                    <Text style={styles.catalogName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.stockRow}>
                      <View
                        style={[
                          styles.stockBadge,
                          stock <= item.min_stock_alert
                            ? styles.stockBadgeLow
                            : styles.stockBadgeNormal,
                        ]}
                      >
                        <Text style={styles.stockBadgeText}>
                          {activeBranch}: {stock} {item.unit}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.addBtnContainer}>
                    {inCart ? (
                      <View style={styles.inCartBadge}>
                        <Text style={styles.inCartBadgeText}>{inCart.quantity} in tray</Text>
                      </View>
                    ) : (
                      <View style={styles.plusBtn}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );

  // =========================================================================
  // RENDER: ZONE 4 (POS PAGE 2 - PAYMENT & TOTALS)
  // =========================================================================
  const renderPaymentScreen = () => {
    const isCredit = paymentStatus === 'credit';

    return (
      <ScrollView
        style={styles.paymentContainer}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: SPACING.lg }}
      >
        <Text style={styles.page2Title}>PAYMENT & CHECKOUT</Text>

        {/* Customer Receipt Summary */}
        <View style={styles.receiptHeaderCard}>
          <Text style={styles.receiptCustomerName}>
            {selectedCustomer?.company_name || selectedCustomer?.name || 'Walk-in Client'}
          </Text>
          <Text style={styles.receiptMeta}>
            Branch: {activeBranch} • Cashier: {currentUser?.name}
          </Text>
        </View>

        {/* Totals & VAT Calculation */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal ({cart.length} items)</Text>
            <Text style={styles.totalVal}>{subtotal.toFixed(3)} OMR</Text>
          </View>

          {/* 5% VAT Toggle */}
          <View style={[styles.totalRow, styles.vatRow]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.totalLabel}>Oman VAT (5%)</Text>
              <TouchableOpacity
                style={[styles.togglePill, applyVat && styles.togglePillActive]}
                onPress={() => setApplyVat(!applyVat)}
              >
                <Text style={styles.togglePillText}>{applyVat ? 'ON' : 'EXEMPT'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.totalVal}>{vatAmount.toFixed(3)} OMR</Text>
          </View>

          <View style={styles.divider} />

          {/* Grand Total */}
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
            <Text style={styles.grandTotalVal}>{totalAmount.toFixed(3)} OMR</Text>
          </View>
        </View>

        {/* Payment Status: Paid vs. Credit Toggle */}
        <Text style={styles.sectionHeader}>PAYMENT STATUS</Text>
        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[
              styles.statusToggleBtn,
              !isCredit && styles.statusToggleBtnPaid,
            ]}
            onPress={() => setPaymentStatus('paid')}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={!isCredit ? '#FFFFFF' : COLORS.textMuted}
            />
            <Text
              style={[
                styles.statusToggleText,
                !isCredit && styles.statusToggleTextActive,
              ]}
            >
              PAID NOW
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusToggleBtn,
              isCredit && styles.statusToggleBtnCredit,
            ]}
            onPress={() => setPaymentStatus('credit')}
          >
            <Ionicons
              name="time"
              size={20}
              color={isCredit ? '#FFFFFF' : COLORS.textMuted}
            />
            <Text
              style={[
                styles.statusToggleText,
                isCredit && styles.statusToggleTextActive,
              ]}
            >
              NOT PAID (CREDIT)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Methods: Cash, Card, Both (Grayed out if Credit) */}
        <View style={isCredit ? styles.disabledSection : null}>
          <Text style={styles.sectionHeader}>PAYMENT METHOD</Text>
          <View style={styles.methodRow}>
            {(['cash', 'card', 'both'] as PaymentMethod[]).map((m) => {
              const isSelected = paymentMethod === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodBtn,
                    isSelected && !isCredit && styles.methodBtnSelected,
                  ]}
                  onPress={() => !isCredit && setPaymentMethod(m)}
                  disabled={isCredit}
                >
                  <Ionicons
                    name={
                      m === 'cash'
                        ? 'cash-outline'
                        : m === 'card'
                        ? 'card-outline'
                        : 'pie-chart-outline'
                    }
                    size={22}
                    color={
                      isCredit
                        ? COLORS.disabledText
                        : isSelected
                        ? '#FFFFFF'
                        : COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.methodBtnText,
                      isSelected && !isCredit && styles.methodBtnTextActive,
                      isCredit && { color: COLORS.disabledText },
                    ]}
                  >
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Split Payment Auto-Balance Inputs (When 'Both' is selected) */}
          {paymentMethod === 'both' && !isCredit && (
            <View style={styles.splitBox}>
              <Text style={styles.splitBoxTitle}>Split Payment Auto-Balance</Text>
              <View style={styles.splitInputsRow}>
                <View style={styles.splitInputCol}>
                  <Text style={styles.splitInputLabel}>Cash Paid (OMR)</Text>
                  <TextInput
                    style={styles.splitInputField}
                    keyboardType="numeric"
                    value={cashPaidInput}
                    onChangeText={handleCashChange}
                  />
                </View>
                <Ionicons
                  name="add"
                  size={20}
                  color={COLORS.textMuted}
                  style={{ alignSelf: 'center', marginTop: 14 }}
                />
                <View style={styles.splitInputCol}>
                  <Text style={styles.splitInputLabel}>Card Paid (OMR)</Text>
                  <TextInput
                    style={styles.splitInputField}
                    keyboardType="numeric"
                    value={cardPaidInput}
                    onChangeText={handleCardChange}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Optional Notes */}
        <Text style={styles.sectionHeader}>INTERNAL SALE NOTES</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="e.g. Collected by installer driver, project site Seeb..."
          placeholderTextColor={COLORS.textMuted}
          value={saleNotes}
          onChangeText={setSaleNotes}
          multiline
        />

        {/* Save Sale Action Button */}
        <TouchableOpacity
          style={[styles.saveSaleBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleCheckoutSale}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
              <Text style={styles.saveSaleText}>
                SAVE SALE & DEDUCT STOCK ({totalAmount.toFixed(3)} OMR)
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.root}>
      {/* If Tablet / Wide Foldable: Render Side-By-Side Split Screen */}
      {isTablet ? (
        <View style={styles.splitScreenWrapper}>
          <View style={styles.leftPane}>{renderItemBuilder()}</View>
          <View style={styles.rightPane}>{renderPaymentScreen()}</View>
        </View>
      ) : (
        /* Mobile Standard 2-Page Flow */
        posPage === 1 ? renderItemBuilder() : renderPaymentScreen()
      )}

      {/* Large Touch Target Keypad Modal */}
      <KeypadModal
        visible={keypadVisible}
        title={keypadTarget?.type === 'qty' ? 'Set Item Quantity' : 'Set Negotiated Unit Price'}
        initialValue={keypadTarget?.currentVal || '0'}
        suffix={keypadTarget?.type === 'price' ? 'OMR' : 'units'}
        isDecimal={keypadTarget?.type === 'price'}
        onConfirm={handleConfirmKeypad}
        onClose={() => setKeypadVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  splitScreenWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    flex: 1.1,
    borderRightWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  rightPane: {
    flex: 0.9,
  },
  builderContainer: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  zone1Container: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  customerIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: '#3B82F622',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  customerTextCol: {
    flex: 1,
  },
  customerLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  customerName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  customerDropdown: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.md,
    marginTop: 4,
    padding: SPACING.sm,
  },
  custSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  custSearchInput: {
    flex: 1,
    height: 36,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    marginLeft: 6,
  },
  custRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#33415544',
  },
  custRowTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  custBalance: {
    color: COLORS.warning,
    fontSize: 10,
    marginTop: 2,
  },
  zone2Container: {
    marginBottom: SPACING.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
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
  categoriesScroll: {
    marginTop: SPACING.xs,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  categoryChipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs - 1,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  zone3Container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xs,
  },
  trayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trayTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  clearCartText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  cartItemsList: {
    gap: 6,
    marginBottom: SPACING.sm,
  },
  cartRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 8,
  },
  cartRowInfo: {
    flex: 1.2,
  },
  cartRowSku: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
  },
  cartRowName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  inlineQtyBox: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 44,
  },
  qtyLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  qtyValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
  },
  inlinePriceBox: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 68,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priceBoxMissing: {
    borderColor: COLORS.danger,
    backgroundColor: '#7F1D1D33',
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  priceValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
  },
  cartRowTotalCol: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  rowTotalValue: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
  },
  deleteRowBtn: {
    padding: 2,
    marginTop: 2,
  },
  catalogHeader: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginVertical: 4,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  catalogCardInCart: {
    borderColor: COLORS.primary,
    backgroundColor: '#1E293BEE',
  },
  catalogSku: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '800',
  },
  catalogName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginTop: 1,
  },
  stockRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeNormal: {
    backgroundColor: '#10B98122',
  },
  stockBadgeLow: {
    backgroundColor: '#F59E0B22',
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addBtnContainer: {
    marginLeft: SPACING.sm,
  },
  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inCartBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  inCartBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '800',
  },
  paymentContainer: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  page2Title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  receiptHeaderCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.md,
  },
  receiptCustomerName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
  receiptMeta: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  totalsCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  vatRow: {
    marginTop: 8,
  },
  totalLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  totalVal: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  togglePill: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  togglePillActive: {
    backgroundColor: COLORS.primary,
  },
  togglePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: SPACING.md,
  },
  grandTotalLabel: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '900',
  },
  grandTotalVal: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
  },
  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statusToggleBtn: {
    flex: 1,
    height: TOUCH_TARGET.buttonHeight,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  statusToggleBtnPaid: {
    backgroundColor: COLORS.success,
    borderColor: '#34D399',
  },
  statusToggleBtnCredit: {
    backgroundColor: COLORS.warning,
    borderColor: '#FBBF24',
  },
  statusToggleText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
  },
  statusToggleTextActive: {
    color: '#FFFFFF',
  },
  disabledSection: {
    opacity: 0.35,
  },
  methodRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  methodBtn: {
    flex: 1,
    height: TOUCH_TARGET.buttonHeight,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 4,
  },
  methodBtnSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  methodBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
  },
  splitBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.md,
  },
  splitBoxTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  splitInputsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  splitInputCol: {
    flex: 1,
  },
  splitInputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  splitInputField: {
    backgroundColor: COLORS.surfaceLight,
    height: TOUCH_TARGET.inputHeight,
    borderRadius: RADIUS.sm,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  notesInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    minHeight: 64,
    marginBottom: SPACING.xl,
  },
  saveSaleBtn: {
    backgroundColor: COLORS.success,
    height: 60,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveSaleText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
