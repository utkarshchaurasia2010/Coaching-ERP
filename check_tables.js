const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkTables() {
  const { data: d1, error: e1 } = await supabase.from('subjects').select('*').limit(1);
  console.log("Subjects:", e1 ? e1.message : "Exists");
  
  const { data: d2, error: e2 } = await supabase.from('batch_subjects').select('*').limit(1);
  console.log("Batch_subjects:", e2 ? e2.message : "Exists");
}

checkTables();
