const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});


const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("--- BRANDS ---");
  const { data: brands } = await supabase.from('brands').select('*');
  console.log(`Brands Count: ${brands?.length}`);
  const brandNames = brands?.map(b => b.brand_name) || [];
  console.log(brandNames);

  // Find a brand that has daily metrics
  const { data: dailyMetrics } = await supabase.from('daily_metrics').select('*').limit(5);
  console.log(`\n--- DAILY METRICS (Global Sample) ---`);
  console.log(dailyMetrics);
  
  if (dailyMetrics && dailyMetrics.length > 0) {
    const brandId = dailyMetrics[0].brand_id;
    const brand = brands.find(b => b.id === brandId);
    console.log(`Using Brand: ${brand?.brand_name || brandId} for calculations`);
    
    // Get latest metrics for this brand
    const { data: latestDaily } = await supabase.from('daily_metrics')
      .select('*')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(1);
      
    console.log(`Latest Daily Metrics for calculation:`, latestDaily);
  }
}
run();
