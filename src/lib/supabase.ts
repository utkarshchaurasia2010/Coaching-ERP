import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let customStorage: any = null;
let tabStorageKey = 'sb-auth-token';

if (typeof window !== 'undefined') {
  try {
    customStorage = window.sessionStorage;
    
    // Generate a unique ID for this specific tab if it doesn't exist
    let tabId = sessionStorage.getItem('erp_tab_id');
    if (!tabId) {
      tabId = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('erp_tab_id', tabId);
    }
    
    tabStorageKey = `sb-auth-${tabId}`;
  } catch (err) {
    console.warn('sessionStorage is not available:', err);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(customStorage ? { storage: customStorage } : {}),
    storageKey: tabStorageKey
  }
});
