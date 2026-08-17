const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function fixDuplicates() {
  const { error } = await supabase.from('enrollments').delete().eq('id', '6aafd741-12b3-47cd-bde3-4685e9209084');
  console.log("Deleted old enrollment. Error:", error);
}

fixDuplicates();
