-- =================================================================================
-- COACHING ERP: ALTER EXAMS SCHEMA FOR SUBJECT-WISE BREAKDOWN
-- Run this script in the Supabase SQL Editor.
-- WARNING: This will drop existing exam data.
-- =================================================================================

-- 1. Drop existing tables if they exist
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS exam_subjects CASCADE;

-- 2. Create updated exams table (no subject_id or max_marks)
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Create exam_subjects table (links exams to multiple subjects)
CREATE TABLE IF NOT EXISTS exam_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    max_marks DECIMAL(10, 2) NOT NULL,
    exam_date DATE, -- Optional: if different subjects happen on different days
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(exam_id, subject_id)
);

-- 4. Create updated exam_results table (links to exam_subjects instead of exams)
CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_subject_id UUID REFERENCES exam_subjects(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(10, 2),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(exam_subject_id, student_id)
);

-- =================================================================================
-- Disable Row Level Security (RLS) as requested
-- =================================================================================

ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results DISABLE ROW LEVEL SECURITY;
