const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function testUpdate() {
  // Find "Batch B (6-8)"
  const { data: batches, error: fetchErr } = await supabase.from('batches').select('*').eq('name', 'Batch B (6-8)');
  if (fetchErr || batches.length === 0) return console.log("Batch not found or error:", fetchErr);
  
  const batchId = batches[0].id;
  
  // Try to update description
  const { data: updateData, error: updateErr } = await supabase
    .from('batches')
    .update({ description: "Testing Description Update" })
    .eq('id', batchId)
    .select();
    
  console.log("Update Error:", updateErr);
  console.log("Updated Data:", updateData);
}

testUpdate();
