export type Branch = 'Al Khoudh' | 'Ghala';
export type UserRole = 'admin' | 'staff' | 'visitor';
export type ProductCategory = 
  | 'Gate Motors' 
  | 'Boom Barriers' 
  | 'Access Control' 
  | 'Locks & Accessories' 
  | 'Spare Parts';

export type PaymentMethod = 'cash' | 'card' | 'both';
export type PaymentStatus = 'paid' | 'credit';

export interface StaffProfile {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
  branch: Branch | 'All';
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  description?: string;
  stock_al_khoudh: number;
  stock_ghala: number;
  min_stock_alert: number;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  company_name?: string;
  phone?: string;
  credit_limit?: number | null;
  current_balance?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number; // dynamically negotiated B2B rate
  total_price: number;
}

export interface Sale {
  id: string;
  invoice_number: string;
  branch: Branch;
  customer_id?: string | null;
  customer_name: string;
  staff_id?: string | null;
  staff_name: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod | null;
  cash_paid: number;
  card_paid: number;
  notes?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface Transfer {
  id: string;
  transfer_number: string;
  from_branch: Branch;
  to_branch: Branch;
  status: 'pending' | 'completed' | 'cancelled';
  transferred_by?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    sku: string;
    product_name: string;
    quantity: number;
  }>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id?: string;
  staff_id?: string;
  staff_name?: string;
  branch?: string;
  details?: Record<string, any>;
  created_at: string;
}
