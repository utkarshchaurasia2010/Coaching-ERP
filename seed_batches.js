const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function seedBatches() {
  const batches = [
    { name: 'Batch A (1-5)' },
    { name: 'Batch B (6-8)' },
    { name: 'Batch C (9)' },
    { name: 'Batch D (10)' },
  ];

  const { data, error } = await supabase.from('batches').insert(batches);
  if (error) {
    console.error('Error seeding batches:', error);
  } else {
    console.log('Seeded batches successfully!');
  }
}

seedBatches();
