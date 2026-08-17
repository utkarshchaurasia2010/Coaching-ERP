-- 1. Add screenshot_url column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- 2. Ensure the receipts bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow public uploads to receipts bucket
CREATE POLICY "Allow public uploads to receipts" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'receipts');

-- 4. Allow public viewing of receipts
CREATE POLICY "Allow public viewing of receipts" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'receipts');

-- 5. Allow public update/delete of receipts
CREATE POLICY "Allow public update of receipts" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'receipts');

CREATE POLICY "Allow public delete of receipts" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'receipts');
