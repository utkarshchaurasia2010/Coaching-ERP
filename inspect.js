const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getTables() {
  console.log('Querying Postgres for table list via RPC...');
  // Since anon key usually can't read information_schema via PostgREST natively unless exposed, 
  // let's just try fetching from 'students' instead of 'student'.
  const { data, error } = await supabase.from('students').select('*').limit(1);
  if (error) console.log('students error:', error.message);
  else console.log('students table exists, columns:', data.length ? Object.keys(data[0]) : 'empty');
}

getTables();
