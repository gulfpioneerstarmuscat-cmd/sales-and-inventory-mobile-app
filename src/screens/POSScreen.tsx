import React, { useState, useEffect, useMemo, useRef } from 'react';
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

  // Customer Direct Search Input State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Horizontal Snapping Carousel State & Ref
  const carouselRef = useRef<FlatList>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Carousel Layout Dimensions (Peeking sides)
  const cardWidth = Math.min(340, Math.round(width * 0.84));
  const cardGap = 10;
  const snapInterval = cardWidth + cardGap;
  const sideInset = Math.max(16, (width - cardWidth) / 2);

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
        setCustomerSearchQuery(defaultCust.company_name ? `${defaultCust.company_name} (${defaultCust.name})` : defaultCust.name);
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

  // Cart Management - Last added item placed first, smooth snap to active
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
        const updatedItem = {
          ...existing,
          quantity: existing.quantity + 1,
          total_price: (existing.quantity + 1) * existing.unit_price,
        };
        // Move updated item to the front so it immediately becomes the visible card
        return [updatedItem, ...prev.filter((item) => item.product.id !== product.id)];
      } else {
        // Add new item at the front (index 0)
        return [
          {
            product,
            quantity: 1,
            unit_price: 0.0,
            total_price: 0.0,
          },
          ...prev,
        ];
      }
    });

    // Snap carousel to the newly added item at index 0
    setTimeout(() => {
      carouselRef.current?.scrollToOffset({ offset: 0, animated: true });
      setActiveCardIndex(0);
    }, 50);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const nextCart = prev.filter((item) => item.product.id !== productId);
      if (activeCardIndex >= nextCart.length) {
        setActiveCardIndex(Math.max(0, nextCart.length - 1));
      }
      return nextCart;
    });
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

  // Filtered Customers for Direct Search Input (1-Flow)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 10);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company_name && c.company_name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearchQuery]);

  const categories = ['All', 'Gate Motors', 'Boom Barriers', 'Access Control', 'Locks & Accessories', 'Spare Parts'];

  // =========================================================================
  // RENDER: ZONE 1 - 3 (POS PAGE 1)
  // =========================================================================
  const renderItemBuilder = () => (
    <View style={styles.builderContainer}>
      {/* Zone 1: Direct Customer Search Input (1-Flow) */}
      <View style={styles.zone1Container}>
        <View style={styles.customerSearchInputBox}>
          <View style={styles.customerIcon}>
            <Ionicons name="business" size={16} color={COLORS.primaryLight} />
          </View>
          <TextInput
            style={styles.customerTextInput}
            placeholder="Search customer name, company or phone..."
            placeholderTextColor={COLORS.textMuted}
            value={customerSearchQuery}
            onChangeText={(text) => {
              setCustomerSearchQuery(text);
              setCustomerDropdownOpen(true);
            }}
            onFocus={() => setCustomerDropdownOpen(true)}
          />
          {customerSearchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setCustomerSearchQuery('');
                setSelectedCustomer(null);
                setCustomerDropdownOpen(true);
              }}
              style={styles.customerClearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setCustomerDropdownOpen(!customerDropdownOpen)}
            style={styles.customerChevronBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={customerDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Live Customer Dropdown List */}
        {customerDropdownOpen && (
          <View style={styles.customerDropdownOverlay}>
            <ScrollView
              style={{ maxHeight: 180 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {filteredCustomers.length === 0 ? (
                <View style={styles.noCustFound}>
                  <Text style={styles.noCustFoundText}>No matching customer found</Text>
                </View>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  return (
                    <TouchableOpacity
                      key={cust.id}
                      style={[styles.custRow, isSelected && styles.custRowSelected]}
                      onPress={() => {
                        setSelectedCustomer(cust);
                        setCustomerSearchQuery(
                          cust.company_name ? `${cust.company_name} (${cust.name})` : cust.name
                        );
                        setCustomerDropdownOpen(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.custRowTitle, isSelected && { color: COLORS.primaryLight }]}>
                          {cust.company_name ? `${cust.company_name} (${cust.name})` : cust.name}
                        </Text>
                        {cust.phone ? <Text style={styles.custPhone}>{cust.phone}</Text> : null}
                      </View>
                      {cust.current_balance ? (
                        <Text style={styles.custBalance}>Bal: {cust.current_balance.toFixed(3)} OMR</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
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

      {/* Zone 3: Horizontal Snapping Builder Carousel + Catalog Products */}
      <View style={styles.zone3Container}>
        {/* Selected Carousel Header (e.g. SELECTED (1/3)) */}
        {cart.length > 0 && (
          <View style={styles.trayHeader}>
            <Text style={styles.trayTitle}>
              SELECTED ({Math.min(activeCardIndex + 1, cart.length)}/{cart.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                setCart([]);
                setActiveCardIndex(0);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearCartText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Horizontal Snapping Carousel Cards (Left-to-Right with Side Peeking) */}
        {cart.length > 0 && (
          <View style={styles.carouselWrapper}>
            <FlatList
              ref={carouselRef}
              data={cart}
              keyExtractor={(item) => item.product.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={snapInterval}
              snapToAlignment="center"
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: sideInset,
                gap: cardGap,
              }}
              onScroll={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / snapInterval);
                const clamped = Math.max(0, Math.min(index, cart.length - 1));
                if (clamped !== activeCardIndex) {
                  setActiveCardIndex(clamped);
                }
              }}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <View style={[styles.cartRowCard, { width: cardWidth }]}>
                  {/* Line 1: Name & SKU on Left, Trash on Right */}
                  <View style={styles.cartRowLine1}>
                    <View style={styles.cartRowInfo}>
                      <Text style={styles.cartRowSku}>{item.product.sku}</Text>
                      <Text style={styles.cartRowName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveFromCart(item.product.id)}
                      style={styles.trashBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>

                  {/* Line 2: The 3 Matching Pills (QTY, PRICE, TOTAL) */}
                  <View style={styles.cartRowLine2}>
                    {/* 1. QTY Pill */}
                    <TouchableOpacity
                      style={styles.pillBox}
                      onPress={() => handleOpenKeypad(item.product.id, 'qty', item.quantity)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.pillLabel}>QTY</Text>
                      <Text style={styles.pillValue}>{item.quantity}</Text>
                    </TouchableOpacity>

                    {/* 2. PRICE Pill */}
                    <TouchableOpacity
                      style={[
                        styles.pillBox,
                        styles.pricePillBox,
                        item.unit_price <= 0 && styles.priceBoxMissing,
                      ]}
                      onPress={() => handleOpenKeypad(item.product.id, 'price', item.unit_price)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.pillLabel}>PRICE</Text>
                      <Text
                        style={[
                          styles.pillValue,
                          item.unit_price <= 0 && styles.pillValueMissing,
                        ]}
                      >
                        {item.unit_price > 0 ? item.unit_price.toFixed(3) : 'SET PRICE'}
                      </Text>
                    </TouchableOpacity>

                    {/* 3. TOTAL Pill */}
                    <View style={[styles.pillBox, styles.totalPillBox]}>
                      <Text style={styles.pillLabel}>TOTAL</Text>
                      <Text style={styles.totalPillValue}>
                        {item.total_price.toFixed(3)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            />
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
            contentContainerStyle={{ paddingBottom: 110 }}
            renderItem={({ item }) => {
              const stock =
                activeBranch === 'Al Khoudh' ? item.stock_al_khoudh : item.stock_ghala;
              const inCart = cart.find((c) => c.product.id === item.id);
              const branchShort = activeBranch === 'Al Khoudh' ? 'Al Khoud' : 'Ghala';

              return (
                <TouchableOpacity
                  style={[styles.catalogCard, inCart && styles.catalogCardInCart]}
                  onPress={() => handleAddToCart(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1, marginRight: SPACING.sm }}>
                    {/* Line 1: SKU with Quantity inline in Green: "SKU (Al Khoud - X)" */}
                    <View style={styles.catalogSkuRow}>
                      <Text style={styles.catalogSku}>{item.sku}</Text>
                      <Text style={styles.catalogStockInline}>
                        {' '}({branchShort} - {stock})
                      </Text>
                    </View>

                    {/* Line 2: Product Name */}
                    <Text style={styles.catalogName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  {/* Action Button: Solid Plus (not in cart) vs Hollow Plus (in cart) */}
                  <View style={styles.addBtnContainer}>
                    {inCart ? (
                      <View style={styles.plusBtnHollow}>
                        <Ionicons name="add" size={20} color={COLORS.primaryLight} />
                      </View>
                    ) : (
                      <View style={styles.plusBtnSolid}>
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
              <Text style={styles.saveSaleText}>
                COMPLETE ({totalAmount.toFixed(3)} OMR)
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
    marginBottom: SPACING.xs,
    zIndex: 50,
  },
  customerSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  customerIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: '#3B82F622',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  customerTextInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    paddingVertical: 0,
  },
  customerClearBtn: {
    padding: 4,
    marginRight: 2,
  },
  customerChevronBtn: {
    padding: 4,
  },
  customerDropdownOverlay: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.md,
    marginTop: 4,
    padding: SPACING.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#33415533',
  },
  custRowSelected: {
    backgroundColor: '#3B82F618',
    borderRadius: RADIUS.sm,
  },
  custRowTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  custPhone: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  custBalance: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  noCustFound: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  noCustFoundText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
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
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    paddingVertical: 0,
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
    marginTop: SPACING.xs,
  },
  trayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: 6,
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
  carouselWrapper: {
    height: 104,
    marginBottom: 8,
  },
  cartRowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'space-between',
    height: 98,
  },
  cartRowLine1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartRowInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  cartRowSku: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cartRowName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs + 1,
    fontWeight: '700',
    marginTop: 1,
  },
  trashBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EF444415',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartRowLine2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#33415533',
  },
  pillBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
    gap: 5,
  },
  pricePillBox: {
    flex: 1.25,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priceBoxMissing: {
    borderColor: COLORS.danger,
    backgroundColor: '#7F1D1D33',
  },
  totalPillBox: {
    flex: 1.15,
    backgroundColor: '#10B98115',
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  pillLabel: {
    color: COLORS.textMuted,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pillValue: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  pillValueMissing: {
    color: COLORS.danger,
    fontSize: 9.5,
  },
  totalPillValue: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '800',
  },
  catalogHeader: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.md,
    marginTop: 6,
    marginBottom: 6,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  catalogCardInCart: {
    borderColor: COLORS.primaryLight,
    backgroundColor: '#1E293BEE',
  },
  catalogSkuRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogSku: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  catalogStockInline: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  catalogName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  addBtnContainer: {
    marginLeft: SPACING.sm,
  },
  plusBtnSolid: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBtnHollow: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
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
