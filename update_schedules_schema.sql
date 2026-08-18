-- Migration to support both Recurring (weekly) and Non-Recurring (specific date) schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS specific_date DATE;
