import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Header } from './src/components/Header';
import { HamburgerMenu } from './src/components/HamburgerMenu';
import { FloatingNavBar, TabScreen } from './src/components/FloatingNavBar';
import { POSScreen } from './src/screens/POSScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileModal } from './src/components/ProfileModal';
import { TransferModal } from './src/components/TransferModal';
import { SettingsModal } from './src/components/SettingsModal';
import { AdminSettingsModal } from './src/components/AdminSettingsModal';
import { CartItem } from './src/types';
import { COLORS } from './src/styles/theme';

const MainApp: React.FC = () => {
  const { currentUser, isLoading, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabScreen>('pos');
  const [posPage, setPosPage] = useState<1 | 2>(1);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
      </View>
    );
  }

  // Not logged in -> Show fast 4-digit PIN unlock screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Calculate cart totals for the dynamic floating pill
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0) * 1.05; // with 5% VAT estimate

  const handleMenuOption = (
    option: 'profile' | 'transfer' | 'settings' | 'admin' | 'logout'
  ) => {
    switch (option) {
      case 'profile':
        setProfileVisible(true);
        break;
      case 'transfer':
        setTransferVisible(true);
        break;
      case 'settings':
        setSettingsVisible(true);
        break;
      case 'admin':
        setAdminVisible(true);
        break;
      case 'logout':
        logout();
        break;
    }
  };

  const handlePressCartPill = () => {
    if (posPage === 1) {
      setPosPage(2);
    } else {
      setPosPage(1);
    }
  };

  return (
    <View style={styles.appRoot}>
      <StatusBar style="light" />

      {/* Global Top Header with Branding, Branch Switcher & Hamburger */}
      <Header onOpenMenu={() => setMenuVisible(true)} />

      {/* Screen Switcher */}
      <View style={styles.mainContent}>
        {currentTab === 'pos' && (
          <POSScreen
            posPage={posPage}
            setPosPage={setPosPage}
            cart={cart}
            setCart={setCart}
            onSaleCompleted={() => {
              // optional post-checkout navigation
            }}
          />
        )}
        {currentTab === 'history' && <HistoryScreen />}
        {currentTab === 'inventory' && (
          <InventoryScreen onOpenTransfer={() => setTransferVisible(true)} />
        )}
      </View>

      {/* Universal Floating Navigation Bar with Dynamic Docked Cart Button */}
      <FloatingNavBar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'pos') setPosPage(1);
        }}
        cartItemCount={cartItemCount}
        cartTotal={cartTotal}
        posPage={posPage}
        onPressCartButton={handlePressCartPill}
      />

      {/* Hamburger Menu Drawer */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSelectOption={handleMenuOption}
      />

      {/* Modals */}
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        onLogout={logout}
      />

      <TransferModal
        visible={transferVisible}
        onClose={() => setTransferVisible(false)}
      />

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      <AdminSettingsModal
        visible={adminVisible}
        onClose={() => setAdminVisible(false)}
      />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
  },
});
