import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = "https://qsecftrjcelcvhsdxqqa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZWNmdHJqY2VsY3Zoc2R4cXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mjc5MzgsImV4cCI6MjA2MDIwMzkzOH0.xng0vrLR55dWfsyggXSme-QOw_xAzdnHa5wxhDdBLSc";
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage
  }
});

console.log("Supabase client initialized");
