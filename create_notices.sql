CREATE TABLE public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  target_audience text default 'all', -- 'all', 'parents', 'staff', 'batch'
  batch_id uuid references public.batches(id),
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  is_active boolean default true
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated or anon (for parent login via phone) to read notices
CREATE POLICY "Enable read access for all users" ON public.notices
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert notices
CREATE POLICY "Enable insert for authenticated users" ON public.notices
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update notices
CREATE POLICY "Enable update for authenticated users" ON public.notices
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
