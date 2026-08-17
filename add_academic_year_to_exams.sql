-- Add academic_year to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year TEXT;
