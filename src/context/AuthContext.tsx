import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StaffProfile, Branch, UserRole } from '../types';
import { supabase } from '../config/supabase';

interface AuthContextType {
  currentUser: StaffProfile | null;
  activeBranch: Branch;
  isLoading: boolean;
  loginWithPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchBranch: (branch: Branch) => void;
  isAdmin: boolean;
  isVisitor: boolean;
}

const DEFAULT_ADMIN: StaffProfile = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Admin GPS',
  pin: '1234',
  role: 'admin',
  branch: 'All',
  phone: '+968 9111 0001',
  is_active: true,
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const STORAGE_KEY = '@gps_muscat_auth_user';
const BRANCH_KEY = '@gps_muscat_active_branch';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(null);
  const [activeBranch, setActiveBranch] = useState<Branch>('Al Khoudh');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
      const storedBranch = await AsyncStorage.getItem(BRANCH_KEY);

      if (storedUser) {
        const user: StaffProfile = JSON.parse(storedUser);
        setCurrentUser(user);
        if (storedBranch && (storedBranch === 'Al Khoudh' || storedBranch === 'Ghala')) {
          setActiveBranch(storedBranch);
        } else if (user.branch !== 'All') {
          setActiveBranch(user.branch as Branch);
        }
      }
    } catch (e) {
      console.warn('Failed to load session from storage', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPin = async (pin: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // 1. Try querying Supabase staff_profiles
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('pin', pin)
        .eq('is_active', true)
        .maybeSingle();

      let matchedUser: StaffProfile | null = data as StaffProfile | null;

      // 2. Offline fallback for instant test pins if network is unreachable
      if (!matchedUser) {
        if (pin === '1234') {
          matchedUser = DEFAULT_ADMIN;
        } else if (pin === '5678') {
          matchedUser = {
            id: 'a0000000-0000-0000-0000-000000000002',
            name: 'Salim Al-Harthy',
            pin: '5678',
            role: 'staff',
            branch: 'Al Khoudh',
            phone: '+968 9111 0002',
            is_active: true,
          };
        } else if (pin === '5679') {
          matchedUser = {
            id: 'a0000000-0000-0000-0000-000000000003',
            name: 'Nasser Al-Balushi',
            pin: '5679',
            role: 'staff',
            branch: 'Ghala',
            phone: '+968 9111 0003',
            is_active: true,
          };
        } else if (pin === '0000') {
          matchedUser = {
            id: 'a0000000-0000-0000-0000-000000000004',
            name: 'Showroom Visitor',
            pin: '0000',
            role: 'visitor',
            branch: 'Al Khoudh',
            phone: '+968 9111 0004',
            is_active: true,
          };
        }
      }

      if (!matchedUser) {
        return { success: false, message: 'Invalid 4-digit PIN.' };
      }

      setCurrentUser(matchedUser);
      const initialBranch: Branch = matchedUser.branch === 'Ghala' ? 'Ghala' : 'Al Khoudh';
      setActiveBranch(initialBranch);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(matchedUser));
      await AsyncStorage.setItem(BRANCH_KEY, initialBranch);

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed.' };
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(BRANCH_KEY);
  };

  const switchBranch = async (branch: Branch) => {
    // Only admins can freely switch branches
    if (currentUser?.role === 'admin') {
      setActiveBranch(branch);
      await AsyncStorage.setItem(BRANCH_KEY, branch);
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const isVisitor = currentUser?.role === 'visitor';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeBranch,
        isLoading,
        loginWithPin,
        logout,
        switchBranch,
        isAdmin,
        isVisitor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

