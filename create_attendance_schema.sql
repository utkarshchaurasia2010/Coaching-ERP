-- =================================================================================
-- ATTENDANCE TABLE SCHEMA (RLS DISABLED)
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

-- 2. Add foreign key constraints safely
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_student_id_fkey') THEN
            ALTER TABLE public.attendance 
            ADD CONSTRAINT attendance_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_batch_id_fkey') THEN
            ALTER TABLE public.attendance 
            ADD CONSTRAINT attendance_batch_id_fkey 
            FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. Explicitly DISABLE RLS on attendance
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- 4. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON public.attendance(batch_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);

-- 5. Reload Supabase API Schema Cache immediately
NOTIFY pgrst, 'reload schema';
