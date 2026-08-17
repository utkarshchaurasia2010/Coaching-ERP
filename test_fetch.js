const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function testFetch() {
  const { data, error } = await supabase
    .from('batches')
    .select(`
      *,
      enrollments (count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("Success:", data);
  }
}

testFetch();
