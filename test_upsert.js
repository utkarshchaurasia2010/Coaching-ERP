import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: subjs } = await supabase.from('exam_subjects').select('*').limit(1);
  const { data: stds } = await supabase.from('students').select('*').limit(2);
  
  if (!subjs || subjs.length === 0) return;
  if (!stds || stds.length < 2) return;
  
  const payload = [
    {
      // NO ID AT ALL
      exam_subject_id: subjs[0].id,
      student_id: stds[0].id,
      marks_obtained: 55,
      remarks: "Updated without ID"
    },
    {
      // NO ID AT ALL
      exam_subject_id: subjs[0].id,
      student_id: stds[1].id,
      marks_obtained: 65,
      remarks: "New without ID"
    }
  ];
  
  console.log("Upserting mixed payload (no IDs at all):");
  let res = await supabase.from('exam_results').upsert(payload, { onConflict: 'exam_subject_id,student_id' }).select();
  console.log(res.error);
  if (res.data) console.log(res.data.map(r => r.marks_obtained));
}

test();
