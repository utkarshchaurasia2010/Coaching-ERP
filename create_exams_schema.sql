-- =================================================================================
-- COACHING ERP: EXAMS & RESULTS SCHEMA
-- Run this script in the Supabase SQL Editor.
-- =================================================================================

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    max_marks DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(10, 2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(exam_id, student_id)
);

-- =================================================================================
-- Enable Row Level Security (RLS)
-- =================================================================================

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- =================================================================================
-- Create Development RLS Policies (Allowing anon read/write for dev)
-- =================================================================================

CREATE POLICY "Allow public all exams" ON exams FOR ALL USING (true);
CREATE POLICY "Allow public all exam_results" ON exam_results FOR ALL USING (true);
