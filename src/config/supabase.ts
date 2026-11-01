import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://vcrlecwkottejtshtplp.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Xa4ORwBBj7xZjzYODJsTIA_IZ8DNVc3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

