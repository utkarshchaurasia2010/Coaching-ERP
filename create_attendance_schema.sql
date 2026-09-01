-- =================================================================================
-- ATTENDANCE TABLE SCHEMA & RLS POLICIES (SAFE VERSION)
-- Run this in Supabase SQL Editor
-- =================================================================================

-- 1. Create the attendance table in public schema
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    academic_year TEXT NOT NULL,
    marked_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (student_id, batch_id, date)
);

-- 2. Add foreign key constraints safely if the referenced tables exist
DO $$ 
BEGIN
    -- Foreign key to students table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_student_id_fkey') THEN
            ALTER TABLE public.attendance 
            ADD CONSTRAINT attendance_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Foreign key to batches table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_batch_id_fkey') THEN
            ALTER TABLE public.attendance 
            ADD CONSTRAINT attendance_batch_id_fkey 
            FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Foreign key to users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_marked_by_fkey') THEN
            ALTER TABLE public.attendance 
            ADD CONSTRAINT attendance_marked_by_fkey 
            FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 4. Clean up existing policies before creating new ones to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated full access to attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow public read access to attendance for parent portal" ON public.attendance;

-- 5. Create RLS Policies
CREATE POLICY "Allow authenticated full access to attendance" 
ON public.attendance FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public read access to attendance for parent portal"
ON public.attendance FOR SELECT 
TO public 
USING (true);

-- 6. Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON public.attendance(batch_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_academic_year ON public.attendance(academic_year);
