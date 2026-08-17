-- =================================================================================
-- COACHING ERP: FULL DATABASE SCHEMA & RLS POLICIES (PART 2)
-- Run this script in the Supabase SQL Editor to create the remaining tables.
-- =================================================================================

-- 1. Academic & Packages Tables

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration_months INTEGER
);

-- 2. Fee Management Tables

CREATE TABLE IF NOT EXISTS fee_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., 'Tuition Fee', 'Library Fee', 'Material Fee'
    description TEXT
);

CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., 'Class 11 Science Standard'
    academic_year TEXT
);

CREATE TABLE IF NOT EXISTS fee_structure_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id UUID REFERENCES fee_structures(id),
    fee_head_id UUID REFERENCES fee_heads(id),
    amount DECIMAL(10, 2) NOT NULL,
    UNIQUE(fee_structure_id, fee_head_id)
);

CREATE TABLE IF NOT EXISTS fee_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    fee_structure_id UUID REFERENCES fee_structures(id),
    assigned_date DATE DEFAULT CURRENT_DATE,
    total_due DECIMAL(10, 2) DEFAULT 0
);

-- 3. Billing & Receipts Tables

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    student_id UUID REFERENCES students(id),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer')),
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID REFERENCES receipts(id),
    fee_head_id UUID REFERENCES fee_heads(id),
    amount_paid DECIMAL(10, 2) NOT NULL
);

-- 4. Communication Table

CREATE TABLE IF NOT EXISTS notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT CHECK (target_audience IN ('all', 'teachers', 'parents', 'students')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =================================================================================
-- Enable Row Level Security (RLS)
-- =================================================================================

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- =================================================================================
-- Create Development RLS Policies (Allowing anon read/write for dev)
-- =================================================================================

CREATE POLICY "Allow public all subjects" ON subjects FOR ALL USING (true);
CREATE POLICY "Allow public all packages" ON packages FOR ALL USING (true);
CREATE POLICY "Allow public all fee_heads" ON fee_heads FOR ALL USING (true);
CREATE POLICY "Allow public all fee_structures" ON fee_structures FOR ALL USING (true);
CREATE POLICY "Allow public all fee_structure_items" ON fee_structure_items FOR ALL USING (true);
CREATE POLICY "Allow public all fee_assignments" ON fee_assignments FOR ALL USING (true);
CREATE POLICY "Allow public all receipts" ON receipts FOR ALL USING (true);
CREATE POLICY "Allow public all receipt_items" ON receipt_items FOR ALL USING (true);
CREATE POLICY "Allow public all notices" ON notices FOR ALL USING (true);
