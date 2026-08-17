const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function testFetch() {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      status,
      students (
        id,
        full_name,
        contact_number,
        gender
      )
    `)
    .limit(1);

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("Success:", JSON.stringify(data, null, 2));
  }
}

testFetch();
