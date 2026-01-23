/* ========================================
   SUPABASE CONFIG
   Configuration for Supabase client
   ======================================== */

// Supabase project configuration
// These are PUBLIC keys - safe to commit
// The anon key is designed to be exposed to clients
export const SUPABASE_URL = 'https://iiiiitmmfrvvuzarrwxe.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpaWlpdG1tZnJ2dnV6YXJyd3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NjEyMDYsImV4cCI6MjA4NDMzNzIwNn0.YJ2a9m3ZRjoQPtDpsGbcpfItIu3yFMRw5lgu3GXdcEk';

// Make available globally as well
if (typeof window !== 'undefined') {
   window.SUPABASE_URL = SUPABASE_URL;
   window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
