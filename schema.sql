-- =================================================================================
-- COACHING ERP: INITIAL DATABASE SCHEMA & RLS POLICIES
-- Run this entire script in the Supabase SQL Editor
-- =================================================================================

-- 1. Create Core Tables (using IF NOT EXISTS to be safe)

CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent', 'student')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
    id UUID PRIMARY KEY REFERENCES users(id),
    department TEXT,
    joining_date DATE,
    contact_number TEXT
);

CREATE TABLE IF NOT EXISTS parent_profiles (
    id UUID PRIMARY KEY REFERENCES users(id),
    contact_number TEXT,
    address TEXT
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    parent_id UUID REFERENCES parent_profiles(id),
    contact_number TEXT,
    email TEXT,
    enrollment_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    batch_id UUID REFERENCES batches(id),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(student_id, batch_id)
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    institute_name TEXT DEFAULT 'Coaching Institute',
    tagline TEXT,
    logo_url TEXT
);

-- Insert default settings row if it doesn't exist
INSERT INTO settings (id, institute_name) 
VALUES (1, 'St. G.N.G. School') 
ON CONFLICT (id) DO NOTHING;

-- =================================================================================
-- 2. Enable Row Level Security (RLS)
-- =================================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =================================================================================
-- 3. Create Development RLS Policies
-- Note: For development, we are allowing anon and authenticated users to read/write.
-- In production, these should be restricted based on the user's role.
-- =================================================================================

-- Users
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON users FOR UPDATE USING (true);

-- Students
CREATE POLICY "Allow public read students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update students" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete students" ON students FOR DELETE USING (true);

-- Batches
CREATE POLICY "Allow public read batches" ON batches FOR SELECT USING (true);
CREATE POLICY "Allow public insert batches" ON batches FOR INSERT WITH CHECK (true);

-- Enrollments
CREATE POLICY "Allow public read enrollments" ON enrollments FOR SELECT USING (true);
CREATE POLICY "Allow public insert enrollments" ON enrollments FOR INSERT WITH CHECK (true);

-- Settings
CREATE POLICY "Allow public read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow public update settings" ON settings FOR UPDATE USING (true);

-- Teacher/Parent Profiles
CREATE POLICY "Allow public read teachers" ON teacher_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read parents" ON parent_profiles FOR SELECT USING (true);
