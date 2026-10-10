-- ==============================================================================
-- School ERP Database Schema Migration
-- ==============================================================================

-- 1. Academic Classes (e.g., Nursery, KG, Class 1 to 12)
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL, -- e.g., 'Class 10', 'Class 12'
  numeric_grade INT NOT NULL, -- 1 to 12 (or 0 for pre-primary)
  stream VARCHAR(50) DEFAULT 'General', -- 'General', 'Science', 'Commerce', 'Arts'
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Class Sections (e.g., Section A, B, C)
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name VARCHAR(20) NOT NULL, -- 'A', 'B', 'Rose', 'Lotus'
  room_no VARCHAR(50),
  max_capacity INT DEFAULT 40,
  class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enhance Students Table with School Specific Columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_no VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_no INT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name VARCHAR(150);
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;

-- 4. Daily Attendance Register
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'half_day', 'leave'
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, student_id)
);

-- 5. Digital Homework Diary & Announcements
CREATE TABLE IF NOT EXISTS school_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  due_date DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Exam Terms (Term 1, Half-Yearly, Finals)
CREATE TABLE IF NOT EXISTS exam_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- 'Unit Test 1', 'Term 1 / Half-Yearly', 'Finals'
  academic_year VARCHAR(20) NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) policies if enabled globally
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_terms ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full read/write access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow auth access on classes') THEN
    CREATE POLICY "Allow auth access on classes" ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow auth access on sections') THEN
    CREATE POLICY "Allow auth access on sections" ON sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow auth access on daily_attendance') THEN
    CREATE POLICY "Allow auth access on daily_attendance" ON daily_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow auth access on school_diary') THEN
    CREATE POLICY "Allow auth access on school_diary" ON school_diary FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow auth access on exam_terms') THEN
    CREATE POLICY "Allow auth access on exam_terms" ON exam_terms FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
