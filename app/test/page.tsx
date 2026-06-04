import { supabase } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

export default async function TestPage() {
  // 1. Total Brands
  const { count: totalBrands } = await supabase
    .from('brands')
    .select('*', { count: 'exact', head: true });

  // 2. Total Posts
  const { count: totalPosts } = await supabase
    .from('media_metrics')
    .select('*', { count: 'exact', head: true });

  // 3. Latest Date
  const { data: latestDateData } = await supabase
    .from('daily_metrics')
    .select('metric_date')
    .order('metric_date', { ascending: false })
    .limit(1);

  const latestDate = latestDateData?.[0]?.metric_date;

  let latestReach = 0;
  let latestFollowers = 0;

  if (latestDate) {
    const { data: latestMetrics } = await supabase
      .from('daily_metrics')
      .select('reach, followers')
      .eq('metric_date', latestDate);

    if (latestMetrics) {
      latestReach = latestMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);
      latestFollowers = latestMetrics.reduce((sum, m) => sum + (m.followers || 0), 0);
    }
  }

  // 4. Last Sync Time
  const { data: lastSyncData } = await supabase
    .from('daily_metrics')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  const lastSyncTime = lastSyncData?.[0]?.created_at;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Backend Test Page</h1>
      <ul style={{ fontSize: '18px', lineHeight: '1.8' }}>
        <li><strong>Total Brands:</strong> {totalBrands ?? 'N/A'}</li>
        <li><strong>Total Posts:</strong> {totalPosts ?? 'N/A'}</li>
        <li><strong>Latest Reach:</strong> {latestReach}</li>
        <li><strong>Latest Followers:</strong> {latestFollowers}</li>
        <li><strong>Last Sync Time:</strong> {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'N/A'}</li>
      </ul>
    </div>
  );
}
