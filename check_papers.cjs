const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://rvkkrxdqlvtitwhicgbc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2a2tyeGRxbHZ0aXR3aGljZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjEwODYsImV4cCI6MjEwMTU5NzA4Nn0.8I2spxI7j3YWEwOlksIS_rNLm_8rpW04fO0hZWyEWF0";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPapers() {
  const { data, error } = await supabase.from('exam_papers').select('*');
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : 0);
  console.log("Data sample:", data ? data.slice(0, 2) : []);
}

checkPapers();
