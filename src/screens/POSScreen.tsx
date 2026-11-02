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
import { SPACING, FONTS, RADIUS, TOUCH_TARGET, ThemeColors, getShadows } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
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
  const { colors, isDark, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark, shadows), [colors, isDark, shadows]);

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

  // Carousel Layout Dimensions (Standardized 16px padding on 8pt grid)
  const cardWidth = Math.min(340, Math.round(width * 0.82));
  const cardGap = 10;
  const snapInterval = cardWidth + cardGap;
  const sideInset = 16;

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

  const handleDecrementQuantity = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const nextCart = prev.filter((item) => item.product.id !== productId);
        if (activeCardIndex >= nextCart.length) {
          setActiveCardIndex(Math.max(0, nextCart.length - 1));
        }
        return nextCart;
      }
      return prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: item.quantity - 1,
              total_price: (item.quantity - 1) * item.unit_price,
            }
          : item
      );
    });
  };

  const handleIncrementQuantity = (product: Product) => {
    const branchStock =
      activeBranch === 'Al Khoudh' ? product.stock_al_khoudh : product.stock_ghala;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (!existing) {
        if (branchStock <= 0) {
          Alert.alert('Out of Stock', `"${product.name}" has 0 stock at ${activeBranch} branch.`);
          return prev;
        }
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
      if (existing.quantity >= branchStock) {
        Alert.alert('Max Stock Reached', `Only ${branchStock} units available at ${activeBranch}.`);
        return prev;
      }
      return prev.map((item) =>
        item.product.id === product.id
          ? {
              ...item,
              quantity: existing.quantity + 1,
              total_price: (existing.quantity + 1) * existing.unit_price,
            }
          : item
      );
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
            <Ionicons name="business" size={16} color={colors.primaryLight} />
          </View>
          <TextInput
            style={styles.customerTextInput}
            placeholder="Search customer name, company or phone..."
            placeholderTextColor={colors.textMuted}
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
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
              color={colors.textSecondary}
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
                        <Text style={[styles.custRowTitle, isSelected && { color: colors.primaryLight }]}>
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
          <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gate motor, remote, SKU..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
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

      {/* Zone 3: Catalog Products (Clean, High Density, Zero Wasted Space) */}
      <View style={styles.zone3Container}>
        <View style={styles.catalogHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.catalogHeader}>CATALOG PRODUCTS</Text>
            <Text style={styles.catalogCount}>({filteredProducts.length} items)</Text>
          </View>
          <TouchableOpacity
            disabled={cart.length === 0}
            onPress={() => setCart([])}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.clearCartText,
                cart.length === 0 ? styles.clearCartTextDisabled : styles.clearCartTextActive,
              ]}
            >
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {loadingData ? (
          <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            scrollEnabled={!isTablet}
            nestedScrollEnabled
            contentContainerStyle={styles.catalogListContent}
            ListFooterComponent={<View style={{ height: 20 }} />}
            renderItem={({ item }) => {
              const stock =
                activeBranch === 'Al Khoudh' ? item.stock_al_khoudh : item.stock_ghala;
              const inCart = cart.find((c) => c.product.id === item.id);
              const branchShort = activeBranch === 'Al Khoudh' ? 'Al Khoud' : 'Ghala';

              return (
                <TouchableOpacity
                  style={[styles.catalogCard, inCart && styles.catalogCardInCart]}
                  onPress={() => !inCart && handleAddToCart(item)}
                  activeOpacity={inCart ? 1 : 0.7}
                >
                  <View style={styles.catalogInfoCol}>
                    {/* Line 1: SKU with Quantity inline in Green: "SKU (Al Khoud - X)" */}
                    <View style={styles.catalogSkuRow}>
                      <Text style={styles.catalogSku} numberOfLines={1}>{item.sku}</Text>
                      <Text style={styles.catalogStockInline}>
                        {' '}({branchShort} - {stock})
                      </Text>
                    </View>

                    {/* Line 2: Product Name */}
                    <Text style={styles.catalogName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  {/* Right Action: [QTY][TRASH] only when in cart, else [+] button */}
                  {inCart ? (
                    <View style={styles.tileActionsRow}>
                      <TouchableOpacity
                        style={styles.stepperQtyPill}
                        onPress={() => handleOpenKeypad(item.id, 'qty', inCart.quantity)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.stepperQtyText}>{inCart.quantity}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.stepperTrashBtn}
                        onPress={() => handleRemoveFromCart(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.catalogAddBtn}
                      onPress={() => handleAddToCart(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );

  // =========================================================================
  // RENDER: ZONE 4 (POS PAGE 2 - PAYMENT & CHECKOUT)
  // =========================================================================
  const renderPaymentScreen = () => {
    const isCredit = paymentStatus === 'credit';

    return (
      <ScrollView
        style={styles.paymentContainer}
        contentContainerStyle={{ paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page2HeaderRow}>
          <Text style={styles.page2Title}>CART & CHECKOUT</Text>
          <TouchableOpacity
            disabled={cart.length === 0}
            onPress={() => setCart([])}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.clearCartText,
                cart.length === 0 ? styles.clearCartTextDisabled : styles.clearCartTextActive,
              ]}
            >
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customer Receipt Summary (Compact, Unified Banner) */}
        <View style={styles.receiptHeaderCard}>
          <View style={styles.receiptIconWrap}>
            <Ionicons name="business" size={16} color={colors.primaryLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.receiptCustomerName} numberOfLines={1}>
              {selectedCustomer?.company_name || selectedCustomer?.name || 'Walk-in Client'}
            </Text>
            <Text style={styles.receiptMeta}>
              Branch: {activeBranch} • Cashier: {currentUser?.name || 'Staff'}
            </Text>
          </View>
        </View>

        {/* Selected Items (Top-Down Vertical List) */}
        {cart.length === 0 ? (
          <View style={styles.emptyCartCard}>
            <View style={styles.emptyCartIconWrap}>
              <Ionicons name="cart-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyCartTitle}>Your Cart is Empty</Text>
            <Text style={styles.emptyCartSubtitle}>
              Add products from the catalog to review items, set negotiated prices, and complete sale.
            </Text>
            <TouchableOpacity
              style={styles.returnToCatalogBtn}
              onPress={() => setPosPage(1)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
              <Text style={styles.returnToCatalogText}>Browse Catalog</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.selectedSection}>
            <View style={styles.selectedHeaderRow}>
              <Text style={styles.sectionHeaderInline}>
                SELECTED ITEMS ({cart.length})
              </Text>
              <Text style={styles.selectedHeaderHint}>Tap price to edit rate</Text>
            </View>

            {cart.map((item) => (
              <View key={item.product.id} style={styles.selectedItemCard}>
                {/* Line 1: SKU & Name on Left, Trash on Right */}
                <View style={styles.selectedCardLine1}>
                  <View style={styles.selectedCardInfo}>
                    <Text style={styles.catalogSku}>{item.product.sku}</Text>
                    <Text style={styles.selectedItemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveFromCart(item.product.id)}
                    style={styles.stepperTrashBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                {/* Line 2: The 3 Compact Pills (QTY, PRICE, TOTAL) */}
                <View style={styles.selectedCardLine2}>
                  {/* 1. QTY Pill */}
                  <TouchableOpacity
                    style={styles.pillBox}
                    onPress={() => handleOpenKeypad(item.product.id, 'qty', item.quantity)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
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
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
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
            ))}
          </View>
        )}

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
              color={!isCredit ? '#FFFFFF' : colors.textMuted}
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
              color={isCredit ? '#FFFFFF' : colors.textMuted}
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
                        ? colors.disabledText
                        : isSelected
                        ? '#FFFFFF'
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.methodBtnText,
                      isSelected && !isCredit && styles.methodBtnTextActive,
                      isCredit && { color: colors.disabledText },
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
                  color={colors.textMuted}
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
          placeholderTextColor={colors.textMuted}
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

const createStyles = (colors: ThemeColors, isDark: boolean, shadows: ReturnType<typeof getShadows>) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  splitScreenWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    flex: 1.1,
    borderRightWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  rightPane: {
    flex: 0.9,
  },
  builderContainer: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  zone1Container: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    zIndex: 50,
  },
  customerSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: SPACING.lg,
    height: TOUCH_TARGET.inputHeight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.ambientCard,
  },
  customerIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  customerTextInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    letterSpacing: FONTS.metrics.bodyTracking,
    paddingVertical: 0,
  },
  customerClearBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerChevronBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerDropdownOverlay: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    ...shadows.atmospheric,
  },
  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  custRowSelected: {
    backgroundColor: colors.primaryMuted,
  },
  custRowTitle: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  custPhone: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  custBalance: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  noCustFound: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  noCustFoundText: {
    color: colors.textMuted,
    fontSize: FONTS.sizes.xs,
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  zone2Container: {
    marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.lg,
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
  categoriesScroll: {
    marginTop: SPACING.sm,
  },
  categoryChip: {
    height: 38,
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
        boxShadow: '0 4px 16px rgba(0, 99, 247, 0.35)',
      } as any,
    }),
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  zone3Container: {
    flex: 1,
    marginTop: SPACING.xs,
  },
  catalogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
    marginBottom: 8,
  },
  catalogHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
    lineHeight: 16,
  },
  catalogCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  catalogListContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.ambientCard,
  },
  catalogCardInCart: {
    borderColor: 'rgba(0, 99, 247, 0.45)',
    backgroundColor: 'rgba(0, 99, 247, 0.05)',
  },
  catalogInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  catalogSkuRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogSku: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  catalogStockInline: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  catalogName: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    letterSpacing: FONTS.metrics.headerTracking,
    marginTop: 2,
  },
  catalogAddBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 99, 247, 0.4)',
      } as any,
    }),
  },
  tileActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperQtyPill: {
    minWidth: 38,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 99, 247, 0.4)',
  },
  stepperQtyText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '800',
  },
  stepperTrashBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 54, 0.25)',
  },
  paymentContainer: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  page2HeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  page2Title: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    letterSpacing: FONTS.metrics.headerTracking,
    lineHeight: 24,
  },
  clearCartText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  clearCartTextActive: {
    color: colors.accent,
  },
  clearCartTextDisabled: {
    color: colors.textMuted,
    opacity: 0.35,
  },
  receiptHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 10,
    ...shadows.ambientCard,
  },
  receiptIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  receiptCustomerName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  receiptMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: FONTS.metrics.bodyTracking,
    marginTop: 2,
  },
  selectedSection: {
    marginBottom: 10,
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionHeaderInline: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  selectedHeaderHint: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  selectedItemCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.ambientCard,
  },
  selectedCardLine1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCardInfo: {
    flex: 1,
    marginRight: 10,
  },
  selectedItemName: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: FONTS.metrics.headerTracking,
    marginTop: 2,
  },
  selectedCardLine2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  pillBox: {
    flex: 1,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pricePillBox: {
    flex: 1.25,
  },
  priceBoxMissing: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  totalPillBox: {
    flex: 1.15,
    backgroundColor: 'rgba(0, 99, 247, 0.12)',
    borderColor: 'rgba(0, 99, 247, 0.25)',
  },
  pillLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pillValue: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  pillValueMissing: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  totalPillValue: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  emptyCartCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
    ...shadows.ambientCard,
  },
  emptyCartIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyCartTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyCartSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  returnToCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  returnToCatalogText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  totalsCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 10,
    ...shadows.ambientCard,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  vatRow: {
    marginTop: 4,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  totalVal: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  togglePill: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  togglePillActive: {
    backgroundColor: colors.primary,
  },
  togglePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 8,
  },
  grandTotalLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  grandTotalVal: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: FONTS.metrics.headerTracking,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statusToggleBtn: {
    flex: 1,
    height: 42,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statusToggleBtnPaid: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  statusToggleBtnCredit: {
    backgroundColor: colors.accent,
    borderColor: colors.accentLight,
  },
  statusToggleText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  statusToggleTextActive: {
    color: '#FFFFFF',
  },
  disabledSection: {
    opacity: 0.35,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  methodBtn: {
    flex: 1,
    height: 42,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 2,
  },
  methodBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 99, 247, 0.35)',
      } as any,
    }),
  },
  methodBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.bodyTracking,
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
  },
  splitBox: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 10,
    ...shadows.ambientCard,
  },
  splitBoxTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.headerTracking,
    marginBottom: 6,
  },
  splitInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitInputCol: {
    flex: 1,
  },
  splitInputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: FONTS.metrics.bodyTracking,
    marginBottom: 4,
  },
  splitInputField: {
    backgroundColor: colors.surfaceRaised,
    height: 38,
    borderRadius: RADIUS.sm,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  notesInput: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
    letterSpacing: FONTS.metrics.bodyTracking,
    minHeight: 46,
    marginBottom: 12,
    ...shadows.ambientCard,
  },
  saveSaleBtn: {
    marginHorizontal: 16,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0063F7',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 12px 28px -6px rgba(0, 99, 247, 0.45)',
      } as any,
    }),
  },
  saveSaleText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  });
