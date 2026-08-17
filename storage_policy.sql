-- Run this in the Supabase SQL Editor to allow image uploads from the app

-- 1. Ensure the bucket exists (just in case)
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anyone to upload images to this bucket
CREATE POLICY "Allow public uploads to student-photos" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'student-photos');

-- 3. Allow anyone to view images in this bucket
CREATE POLICY "Allow public viewing of student-photos" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'student-photos');

-- 4. Allow anyone to update/delete (for dev purposes)
CREATE POLICY "Allow public update of student-photos" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'student-photos');

CREATE POLICY "Allow public delete of student-photos" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'student-photos');
