const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function testInsert() {
  const { error } = await supabase
    .from('batches')
    .insert({
      name: 'Test Batch',
      description: 'Test Desc',
      start_date: '2026-08-01',
      end_date: '2026-08-31',
      status: 'active'
    });

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("Success");
  }
}

testInsert();
