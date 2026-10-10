-- ==============================================================================
-- School ERP Unified Schema Migration (Resolving Table Collisions)
-- ==============================================================================

-- 1. Unify batches table with School Class & Section hierarchy
ALTER TABLE batches ADD COLUMN IF NOT EXISTS class_name VARCHAR(100); -- e.g., 'Class 10', 'Class 6'
ALTER TABLE batches ADD COLUMN IF NOT EXISTS section VARCHAR(20) DEFAULT 'A'; -- e.g., 'A', 'B', 'Rose'
ALTER TABLE batches ADD COLUMN IF NOT EXISTS numeric_grade INT DEFAULT 1; -- 1 to 12
ALTER TABLE batches ADD COLUMN IF NOT EXISTS stream VARCHAR(50) DEFAULT 'General'; -- 'General', 'Science', 'Commerce', 'Arts'
ALTER TABLE batches ADD COLUMN IF NOT EXISTS room_no VARCHAR(50);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Populate class_name and section from existing name if empty
UPDATE batches 
SET class_name = name, 
    section = 'A'
WHERE class_name IS NULL;

-- 3. Ensure student table has school columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_no VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_no INT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name VARCHAR(150);
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;

-- 4. Daily Attendance Register (linking to the unified batch/class_section entity)
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'half_day', 'leave'
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, student_id)
);

-- 5. Digital School Diary & Homework (linking to unified batch/class_section entity)
CREATE TABLE IF NOT EXISTS school_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  due_date DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Clean up redundant standalone tables to avoid collisions
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS classes CASCADE;

-- 7. Ensure RLS policies
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_diary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow auth access on daily_attendance') THEN
    CREATE POLICY "Allow auth access on daily_attendance" ON daily_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow auth access on school_diary') THEN
    CREATE POLICY "Allow auth access on school_diary" ON school_diary FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
