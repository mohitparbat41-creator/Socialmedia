import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey);
  const token = process.env.META_ACCESS_TOKEN;
  const apiVersion = process.env.META_API_VERSION || 'v19.0';
  
  const report: any = {};

  try {
    const { data: brands } = await client
      .from('brands')
      .select('*')
      .not('instagram_business_id', 'is', null)
      .limit(1);

    if (brands && brands.length > 0) {
      const igId = brands[0].instagram_business_id;

      // 1. Test profile_views
      const profileViewsUrl = `https://graph.facebook.com/${apiVersion}/${igId}/insights?metric=profile_views&period=day&access_token=${token}`;
      const profileViewsRes = await fetch(profileViewsUrl);
      report.profile_views_tested = profileViewsRes.ok;
      if (!profileViewsRes.ok) report.profile_views_error = await profileViewsRes.json();

      // 2. Test media edge (posts)
      const mediaUrl = `https://graph.facebook.com/${apiVersion}/${igId}/media?fields=id,media_type,like_count,comments_count&limit=2&access_token=${token}`;
      const mediaRes = await fetch(mediaUrl);
      report.media_edge_tested = mediaRes.ok;
      const mediaData = await mediaRes.json();

      if (mediaRes.ok && mediaData.data && mediaData.data.length > 0) {
        const mediaId = mediaData.data[0].id;
        
        // 3. Test media insights
        const mediaInsightsUrl = `https://graph.facebook.com/${apiVersion}/${mediaId}/insights?metric=saved,shares,reach&access_token=${token}`;
        const mediaInsightsRes = await fetch(mediaInsightsUrl);
        report.media_insights_tested = mediaInsightsRes.ok;
        if (!mediaInsightsRes.ok) report.media_insights_error = await mediaInsightsRes.json();
      }

      // 4. Test audience demographics
      const demoUrl = `https://graph.facebook.com/${apiVersion}/${igId}/insights?metric=audience_city,audience_gender_age&period=lifetime&access_token=${token}`;
      const demoRes = await fetch(demoUrl);
      report.audience_demo_tested = demoRes.ok;
      if (!demoRes.ok) report.audience_demo_error = await demoRes.json();

      // 5. Test online followers
      const onlineUrl = `https://graph.facebook.com/${apiVersion}/${igId}/insights?metric=online_followers&period=lifetime&access_token=${token}`;
      const onlineRes = await fetch(onlineUrl);
      report.online_followers_tested = onlineRes.ok;
      if (!onlineRes.ok) report.online_followers_error = await onlineRes.json();
    }
  } catch (error: any) {
    report.fatal_error = error.message;
  }

  return NextResponse.json(report);
}
