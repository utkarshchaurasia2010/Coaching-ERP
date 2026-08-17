const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function updateBatch() {
  const { data, error } = await supabase
    .from('batches')
    .update({ description: 'Classes 6 to 8 combined batch' })
    .eq('name', 'Class 6 to 8');
    
  console.log("Error:", error);
  console.log("Updated!");
}

updateBatch();
