-- ==============================================================================
-- GPS MUSCAT B2B POS MOBILE APP - DATABASE FOUNDATION (PHASE 1)
-- ==============================================================================
-- Dedicated wholesale security automation POS schema for Al Khoudh & Ghala branches.
-- Includes:
--   1.1 Tables: staff_profiles, products, customers, sales, sale_items, transfers, audit_logs
--   1.2 Performance Indexes for <5ms lookups across 500+ SKUs
--   1.3 Concurrency-safe Atomic RPC checkout & transfer functions
--   1.4 Seed Data: Roles (Admin PIN 1234, Staff PIN 5678/5679, Visitor PIN 0000),
--       B2B Customers, and Security Hardware SKUs (Gate Motors, Barriers, Access Control, Locks)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing tables if re-running migration
DROP FUNCTION IF EXISTS process_b2b_sale(TEXT, UUID, TEXT, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, JSONB);
DROP FUNCTION IF EXISTS process_interbranch_transfer(TEXT, TEXT, UUID, TEXT, TEXT, JSONB);
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS staff_profiles CASCADE;

-- ------------------------------------------------------------------------------
-- 1.1 SCHEMA CREATION
-- ------------------------------------------------------------------------------

-- 1. Staff Profiles (RBAC with PIN authentication)
CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pin TEXT NOT NULL, -- 4-digit PIN for instant floor staff access
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'visitor')),
    branch TEXT NOT NULL CHECK (branch IN ('Al Khoudh', 'Ghala', 'All')),
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Products (Zero-image, SKU-based, dynamic pricing, branch stock counts)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Gate Motors', 'Boom Barriers', 'Access Control', 'Locks & Accessories', 'Spare Parts')),
    description TEXT,
    stock_al_khoudh INT NOT NULL DEFAULT 0 CHECK (stock_al_khoudh >= 0),
    stock_ghala INT NOT NULL DEFAULT 0 CHECK (stock_ghala >= 0),
    min_stock_alert INT NOT NULL DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'pcs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Customers (B2B Contractors, Installers, Walk-ins)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    client_type TEXT NOT NULL CHECK (client_type IN ('retail_installer', 'monthly_contractor', 'walk_in', 'other')),
    credit_limit NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    current_balance NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    branch TEXT NOT NULL DEFAULT 'All' CHECK (branch IN ('Al Khoudh', 'Ghala', 'All')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Sales Header
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    branch TEXT NOT NULL CHECK (branch IN ('Al Khoudh', 'Ghala')),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    staff_name TEXT NOT NULL,
    subtotal NUMERIC(10, 3) NOT NULL CHECK (subtotal >= 0),
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.05, -- 5% Oman standard VAT
    vat_amount NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    total_amount NUMERIC(10, 3) NOT NULL CHECK (total_amount >= 0),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'credit')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'both')),
    cash_paid NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    card_paid NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Sale Line Items (Itemized negotiated prices per line)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 3) NOT NULL CHECK (unit_price >= 0), -- Dynamically negotiated B2B unit price
    total_price NUMERIC(10, 3) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Inter-Branch Stock Transfers
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number TEXT UNIQUE NOT NULL,
    from_branch TEXT NOT NULL CHECK (from_branch IN ('Al Khoudh', 'Ghala')),
    to_branch TEXT NOT NULL CHECK (to_branch IN ('Al Khoudh', 'Ghala')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    transferred_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    notes TEXT,
    items JSONB NOT NULL, -- Array of [{ product_id, sku, product_name, quantity }]
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL, -- 'SALE_CREATED', 'STOCK_TRANSFER', 'STOCK_ADJUSTMENT', 'AUTH_LOGIN'
    entity TEXT NOT NULL, -- 'sales', 'products', 'transfers', 'auth'
    entity_id TEXT,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    staff_name TEXT,
    branch TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 1.2 INDEXES & PERFORMANCE TUNING
-- ------------------------------------------------------------------------------

-- Products: High-frequency catalog search (<5ms for 500+ SKUs)
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_stock_khoudh ON products(stock_al_khoudh);
CREATE INDEX idx_products_stock_ghala ON products(stock_ghala);

-- Customers: Search by company or contact name
CREATE INDEX idx_customers_name ON customers USING gin(to_tsvector('english', name));
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_type ON customers(client_type);

-- Sales & Items: Branch filtering & historical analytics
CREATE INDEX idx_sales_branch ON sales(branch);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_invoice ON sales(invoice_number);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Transfers & Audits
CREATE INDEX idx_transfers_created_at ON transfers(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 1.3 ATOMIC CHECKOUT & TRANSFER RPC FUNCTIONS
-- ------------------------------------------------------------------------------

-- A. Concurrency-Safe Atomic Sale Processing
CREATE OR REPLACE FUNCTION process_b2b_sale(
    p_branch TEXT,
    p_customer_id UUID,
    p_customer_name TEXT,
    p_staff_id UUID,
    p_staff_name TEXT,
    p_subtotal NUMERIC,
    p_vat_rate NUMERIC,
    p_vat_amount NUMERIC,
    p_total_amount NUMERIC,
    p_payment_status TEXT, -- 'paid' or 'credit'
    p_payment_method TEXT, -- 'cash', 'card', 'both', or NULL if credit
    p_cash_paid NUMERIC,
    p_card_paid NUMERIC,
    p_notes TEXT,
    p_items JSONB          -- array of [{"product_id": "...", "sku": "...", "product_name": "...", "quantity": 1, "unit_price": 45.000, "total_price": 45.000}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_invoice_number TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_qty INT;
    v_unit_price NUMERIC;
    v_total_price NUMERIC;
    v_sku TEXT;
    v_pname TEXT;
    v_current_khoudh INT;
    v_current_ghala INT;
    v_today_str TEXT;
    v_seq_num INT;
BEGIN
    -- 1. Validate branch
    IF p_branch NOT IN ('Al Khoudh', 'Ghala') THEN
        RAISE EXCEPTION 'Invalid branch "%". Must be Al Khoudh or Ghala.', p_branch;
    END IF;

    -- 2. Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot process sale with empty items list.';
    END IF;

    -- 3. Generate human-readable invoice number: INV-YYYYMMDD-XXXX
    v_today_str := to_char(now(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_seq_num FROM sales WHERE invoice_number LIKE 'INV-' || v_today_str || '-%';
    v_invoice_number := 'INV-' || v_today_str || '-' || lpad(v_seq_num::text, 4, '0');

    -- 4. Insert sales header
    INSERT INTO sales (
        invoice_number,
        branch,
        customer_id,
        customer_name,
        staff_id,
        staff_name,
        subtotal,
        vat_rate,
        vat_amount,
        total_amount,
        payment_status,
        payment_method,
        cash_paid,
        card_paid,
        notes
    ) VALUES (
        v_invoice_number,
        p_branch,
        p_customer_id,
        p_customer_name,
        p_staff_id,
        p_staff_name,
        p_subtotal,
        COALESCE(p_vat_rate, 0.05),
        COALESCE(p_vat_amount, 0),
        p_total_amount,
        p_payment_status,
        p_payment_method,
        COALESCE(p_cash_paid, 0),
        COALESCE(p_card_paid, 0),
        p_notes
    ) RETURNING id INTO v_sale_id;

    -- 5. Iterate each line item: lock product, verify branch stock, decrement, insert sale_item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_sku := v_item->>'sku';
        v_pname := v_item->>'product_name';
        v_total_price := COALESCE((v_item->>'total_price')::NUMERIC, v_qty * v_unit_price);

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero for SKU: %', v_sku;
        END IF;

        -- Row-level locking to avoid race conditions
        SELECT stock_al_khoudh, stock_ghala, sku, name
        INTO v_current_khoudh, v_current_ghala, v_sku, v_pname
        FROM products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product with ID % not found in database.', v_product_id;
        END IF;

        -- Branch stock check & atomic decrement
        IF p_branch = 'Al Khoudh' THEN
            IF v_current_khoudh < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock in Al Khoudh for "%" (SKU: %). Requested: %, Available: %',
                    v_pname, v_sku, v_qty, v_current_khoudh;
            END IF;
            UPDATE products
            SET stock_al_khoudh = stock_al_khoudh - v_qty,
                updated_at = now()
            WHERE id = v_product_id;
        ELSIF p_branch = 'Ghala' THEN
            IF v_current_ghala < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock in Ghala for "%" (SKU: %). Requested: %, Available: %',
                    v_pname, v_sku, v_qty, v_current_ghala;
            END IF;
            UPDATE products
            SET stock_ghala = stock_ghala - v_qty,
                updated_at = now()
            WHERE id = v_product_id;
        END IF;

        -- Record line item
        INSERT INTO sale_items (
            sale_id,
            product_id,
            sku,
            product_name,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_sale_id,
            v_product_id,
            v_sku,
            v_pname,
            v_qty,
            v_unit_price,
            v_total_price
        );
    END LOOP;

    -- 6. Update customer balance if on credit
    IF p_payment_status = 'credit' AND p_customer_id IS NOT NULL THEN
        UPDATE customers
        SET current_balance = COALESCE(current_balance, 0) + p_total_amount,
            updated_at = now()
        WHERE id = p_customer_id;
    END IF;

    -- 7. Record Audit Log
    INSERT INTO audit_logs (
        action,
        entity,
        entity_id,
        staff_id,
        staff_name,
        branch,
        details
    ) VALUES (
        'SALE_CREATED',
        'sales',
        v_sale_id::text,
        p_staff_id,
        p_staff_name,
        p_branch,
        jsonb_build_object(
            'invoice_number', v_invoice_number,
            'total_amount', p_total_amount,
            'payment_status', p_payment_status,
            'payment_method', p_payment_method,
            'items_count', jsonb_array_length(p_items)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'invoice_number', v_invoice_number,
        'branch', p_branch,
        'total_amount', p_total_amount,
        'created_at', now()
    );
END;
$$;

-- B. Inter-Branch Stock Movement RPC
CREATE OR REPLACE FUNCTION process_interbranch_transfer(
    p_from_branch TEXT,
    p_to_branch TEXT,
    p_staff_id UUID,
    p_staff_name TEXT,
    p_notes TEXT,
    p_items JSONB -- array of [{"product_id": "...", "quantity": 5}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer_id UUID;
    v_transfer_number TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_qty INT;
    v_current_from_stock INT;
    v_sku TEXT;
    v_pname TEXT;
    v_today_str TEXT;
    v_seq_num INT;
BEGIN
    IF p_from_branch = p_to_branch THEN
        RAISE EXCEPTION 'Sender and Receiver branches cannot be identical (%).', p_from_branch;
    END IF;

    IF p_from_branch NOT IN ('Al Khoudh', 'Ghala') OR p_to_branch NOT IN ('Al Khoudh', 'Ghala') THEN
        RAISE EXCEPTION 'Invalid branch pair. Must be Al Khoudh and Ghala.';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Transfer must contain at least one item.';
    END IF;

    v_today_str := to_char(now(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_seq_num FROM transfers WHERE transfer_number LIKE 'TRF-' || v_today_str || '-%';
    v_transfer_number := 'TRF-' || v_today_str || '-' || lpad(v_seq_num::text, 4, '0');

    -- Insert transfer header
    INSERT INTO transfers (
        transfer_number,
        from_branch,
        to_branch,
        status,
        transferred_by,
        notes,
        items
    ) VALUES (
        v_transfer_number,
        p_from_branch,
        p_to_branch,
        'completed',
        p_staff_id,
        p_notes,
        p_items
    ) RETURNING id INTO v_transfer_id;

    -- Process each transfer line atomically
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Transfer quantity must be greater than zero.';
        END IF;

        IF p_from_branch = 'Al Khoudh' THEN
            SELECT stock_al_khoudh, sku, name INTO v_current_from_stock, v_sku, v_pname
            FROM products WHERE id = v_product_id FOR UPDATE;

            IF v_current_from_stock < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock in Al Khoudh for "%" (SKU: %). Requested: %, Available: %',
                    v_pname, v_sku, v_qty, v_current_from_stock;
            END IF;

            UPDATE products
            SET stock_al_khoudh = stock_al_khoudh - v_qty,
                stock_ghala = stock_ghala + v_qty,
                updated_at = now()
            WHERE id = v_product_id;
        ELSE
            SELECT stock_ghala, sku, name INTO v_current_from_stock, v_sku, v_pname
            FROM products WHERE id = v_product_id FOR UPDATE;

            IF v_current_from_stock < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock in Ghala for "%" (SKU: %). Requested: %, Available: %',
                    v_pname, v_sku, v_qty, v_current_from_stock;
            END IF;

            UPDATE products
            SET stock_ghala = stock_ghala - v_qty,
                stock_al_khoudh = stock_al_khoudh + v_qty,
                updated_at = now()
            WHERE id = v_product_id;
        END IF;
    END LOOP;

    -- Record Audit Log
    INSERT INTO audit_logs (
        action,
        entity,
        entity_id,
        staff_id,
        staff_name,
        branch,
        details
    ) VALUES (
        'STOCK_TRANSFER',
        'transfers',
        v_transfer_id::text,
        p_staff_id,
        p_staff_name,
        p_from_branch || ' -> ' || p_to_branch,
        jsonb_build_object(
            'transfer_number', v_transfer_number,
            'from_branch', p_from_branch,
            'to_branch', p_to_branch,
            'items_count', jsonb_array_length(p_items)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'transfer_number', v_transfer_number,
        'from_branch', p_from_branch,
        'to_branch', p_to_branch
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- SECURITY POLICIES (Row-Level Security)
-- ------------------------------------------------------------------------------
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write on staff_profiles" ON staff_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on sale_items" ON sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on transfers" ON transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE staff_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE products TO anon, authenticated, service_role;
GRANT ALL ON TABLE customers TO anon, authenticated, service_role;
GRANT ALL ON TABLE sales TO anon, authenticated, service_role;
GRANT ALL ON TABLE sale_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE transfers TO anon, authenticated, service_role;
GRANT ALL ON TABLE audit_logs TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 1.4 SEED DATA: STAFF, CUSTOMERS & SECURITY HARDWARE CATALOG
-- ------------------------------------------------------------------------------

-- Seed Staff Profiles (Admin PIN 1234, Staff PIN 5678/5679, Visitor PIN 0000)
INSERT INTO staff_profiles (id, name, pin, role, branch, phone) VALUES
('a0000000-0000-0000-0000-000000000001', 'Admin GPS', '1234', 'admin', 'All', '+968 9111 0001'),
('a0000000-0000-0000-0000-000000000002', 'Salim Al-Harthy', '5678', 'staff', 'Al Khoudh', '+968 9111 0002'),
('a0000000-0000-0000-0000-000000000003', 'Nasser Al-Balushi', '5679', 'staff', 'Ghala', '+968 9111 0003'),
('a0000000-0000-0000-0000-000000000004', 'Showroom Visitor', '0000', 'visitor', 'Al Khoudh', '+968 9111 0004')
ON CONFLICT (id) DO NOTHING;

-- Seed B2B Customers
INSERT INTO customers (id, name, company_name, phone, client_type, credit_limit, current_balance, branch) VALUES
('c0000000-0000-0000-0000-000000000001', 'Tariq Al-Riyami', 'Al-Riyami Automation & Gates', '+968 9123 4567', 'retail_installer', 2500.000, 340.000, 'Al Khoudh'),
('c0000000-0000-0000-0000-000000000002', 'Ahmed Al-Kindi', 'Muscat Integrated Contracting LLC', '+968 9876 5432', 'monthly_contractor', 5000.000, 1150.000, 'Ghala'),
('c0000000-0000-0000-0000-000000000003', 'Faisal Al-Maamari', 'Barka Gate Systems', '+968 9555 1234', 'retail_installer', 1500.000, 0.000, 'Al Khoudh'),
('c0000000-0000-0000-0000-000000000004', 'Sultan Al-Habsi', 'Al-Dakhiliyah Security Solutions', '+968 9444 8899', 'monthly_contractor', 4000.000, 780.000, 'Ghala'),
('c0000000-0000-0000-0000-000000000005', 'Walk-in Installer', 'General Installer / Cash Client', '+968 9000 0000', 'walk_in', 0.000, 0.000, 'All')
ON CONFLICT (id) DO NOTHING;

-- Seed Security Automation Hardware Catalog (GPS Muscat core catalog)
INSERT INTO products (id, sku, name, category, description, stock_al_khoudh, stock_ghala, min_stock_alert, unit) VALUES
-- Gate Motors
('b0000000-0000-0000-0000-000000000001', 'GM-NICE-ROBO600', 'Nice Robo 600 Sliding Gate Motor 600kg', 'Gate Motors', '230V irreversible electro-mechanical sliding motor with integrated ROA40 control unit', 14, 8, 3, 'kit'),
('b0000000-0000-0000-0000-000000000002', 'GM-BFT-DEIMOS600', 'BFT Deimos BT A600 Sliding Motor 24V', 'Gate Motors', '24V intensive use motor for sliding gates up to 600kg, Hamal control board', 10, 12, 4, 'kit'),
('b0000000-0000-0000-0000-000000000003', 'GM-BENINCA-BULL8', 'Beninca Bull 8M Sliding Gate Motor 800kg', 'Gate Motors', 'Heavy-duty 230Vac motor with built-in CP.BULL8-OM control panel', 6, 4, 2, 'kit'),
('b0000000-0000-0000-0000-000000000004', 'GM-CAME-ATI3000', 'Came ATI 3000 Double Swing Gate Kit', 'Gate Motors', 'Electromechanical gearmotor for swing gates with leaves up to 3m / 3000 series', 5, 3, 2, 'kit'),
('b0000000-0000-0000-0000-000000000005', 'GM-SOMMER-TWIST200', 'Sommer Twist 200 E Swing Gate Operator', 'Gate Motors', 'German precision 24V swing gate drive for residential leaves up to 2.5m', 4, 6, 2, 'kit'),

-- Boom Barriers
('b0000000-0000-0000-0000-000000000006', 'BB-BFT-GIOTTO36', 'BFT Giotto Ultra 36 24V 4M Boom Barrier', 'Boom Barriers', '24V intensive barrier with 4m boom arm, opening speed 4s, built-in control board', 4, 2, 2, 'unit'),
('b0000000-0000-0000-0000-000000000007', 'BB-NICE-WIDE-M', 'Nice Wide M 4-Meter Automatic Barrier', 'Boom Barriers', '24Vdc electromechanical barrier gate with integrated control unit for 4m roadway', 3, 5, 2, 'unit'),
('b0000000-0000-0000-0000-000000000008', 'BB-CAME-G4000', 'Came Gard 4000 Fast Barrier 24V 4M', 'Boom Barriers', 'High-duty fast automatic road barrier for access passages up to 4 meters', 2, 3, 1, 'unit'),

-- Access Control
('b0000000-0000-0000-0000-000000000009', 'AC-ZK-PROCAPTURE', 'ZKTeco ProCapture-T Access Terminal', 'Access Control', 'SilkID fingerprint sensor and RFID reader with TCP/IP and Wiegand out', 18, 15, 5, 'pcs'),
('b0000000-0000-0000-0000-000000000010', 'AC-HIK-DSK1T341', 'Hikvision Face Recognition Terminal DS-K1T341', 'Access Control', '4.3-inch touch screen, 3000 faces capacity, deep learning algorithm', 8, 6, 2, 'pcs'),
('b0000000-0000-0000-0000-000000000011', 'AC-SEBURY-WIEGAND', 'Sebury Waterproof RFID Wiegand Keypad', 'Access Control', 'IP68 zinc-alloy standalone or slave access control keypad for 125KHz cards', 35, 25, 10, 'pcs'),
('b0000000-0000-0000-0000-000000000012', 'AC-ANVIZ-VF30', 'Anviz VF30 Pro Fingerprint & RFID Controller', 'Access Control', 'Autonomous PoE access control terminal with 1GHz processor and Bionano algorithm', 12, 10, 4, 'pcs'),

-- Remotes & Transmitters
('b0000000-0000-0000-0000-000000000013', 'RM-NICE-FLO2RE', 'Nice FLO2RE Era 2-Channel 433.92MHz Remote', 'Locks & Accessories', 'Rolling code 2-channel miniature transmitter for Nice automation kits', 120, 85, 20, 'pcs'),
('b0000000-0000-0000-0000-000000000014', 'RM-BFT-MITTO2', 'BFT Mitto B RCB02 R1 2-Channel Remote', 'Locks & Accessories', '433MHz rolling code dual channel handheld transmitter for BFT motors & barriers', 95, 110, 20, 'pcs'),
('b0000000-0000-0000-0000-000000000015', 'RM-BENINCA-TOGO2', 'Beninca TO.GO 2VA 433MHz Rolling Code Remote', 'Locks & Accessories', 'Dual ARC code remote control with 2 programmable buttons', 70, 60, 15, 'pcs'),

-- Locks & Accessories
('b0000000-0000-0000-0000-000000000016', 'LK-YLI-YM280', 'Yli YM-280 Magnetic Lock 280kg / 600lbs LED', 'Locks & Accessories', 'Single door magnetic lock with LED status indicator, 12V/24V DC', 45, 30, 8, 'pcs'),
('b0000000-0000-0000-0000-000000000017', 'LK-YLI-YM500', 'Yli YM-500 Heavy-Duty Magnetic Lock 500kg', 'Locks & Accessories', 'High holding force electromagnetic lock 1200lbs for heavy security gates', 20, 15, 4, 'pcs'),
('b0000000-0000-0000-0000-000000000018', 'LK-SEC-DROPBOLT', 'Heavy-Duty Electric Drop Bolt Lock with Timer', 'Locks & Accessories', 'Fail-safe motor-driven bolt lock with auto-relock delay 0/3/6/9s', 25, 20, 5, 'pcs'),
('b0000000-0000-0000-0000-000000000019', 'SP-GEAR-RACK-STEEL', 'Heavy Steel Gear Rack M4 (1 Meter)', 'Spare Parts', 'Zinc-plated solid steel 30x12mm gear rack with mounting spacers for sliding motors', 150, 120, 30, 'pcs'),
('b0000000-0000-0000-0000-000000000020', 'SP-NICE-EPM-PHOTOCELL', 'Nice EPM Pair Outdoor Safety Photocells', 'Spare Parts', 'Synchronized surface-mounted photocell pair with 15-meter range', 40, 35, 10, 'pair')
ON CONFLICT (id) DO NOTHING;
