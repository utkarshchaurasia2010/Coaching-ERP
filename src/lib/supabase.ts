import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let customStorage: any = null;
if (typeof window !== 'undefined') {
  try {
    customStorage = window.sessionStorage;
  } catch (err) {
    console.warn('sessionStorage is not available:', err);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(customStorage ? { storage: customStorage } : {})
  }
});
