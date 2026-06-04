const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getCounts() {
  const tables = ['brands', 'daily_metrics', 'media_metrics', 'audience_demographics'];
  
  console.log("=== Exact Row Counts ===");
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error(`Error fetching count for ${table}:`, error.message);
    } else {
      console.log(`${table}: ${count} rows`);
    }
  }
}

getCounts();
