const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkSchema() {
  const { data, error } = await supabase.from('enrollments').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(data.length > 0 ? Object.keys(data[0]) : 'Table is empty');
  }
}
checkSchema();
