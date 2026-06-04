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
    // 1. Verify token validity
    const debugTokenUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`;
    const tokenRes = await fetch(debugTokenUrl);
    const tokenData = await tokenRes.json();
    report.step1_token_validity = tokenData;

    // 2. Verify /me/accounts
    const accountsUrl = `https://graph.facebook.com/${apiVersion}/me/accounts?access_token=${token}&limit=100`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();
    report.step2_me_accounts = {
      count: accountsData.data?.length || 0,
      pages: accountsData.data?.map((p: any) => ({ name: p.name, id: p.id }))
    };

    // 3. Verify all Instagram Business IDs are accessible
    const { data: brands } = await client
      .from('brands')
      .select('*')
      .not('instagram_business_id', 'is', null)
      .order('brand_name', { ascending: true });
      
    report.step3_brands = brands;

    if (brands && brands.length > 0) {
      // 4 & 5. Test sync for a single brand (the first one)
      const brand = brands[0];
      const igId = brand.instagram_business_id;
      
      const fieldsUrl = `https://graph.facebook.com/${apiVersion}/${igId}?fields=followers_count,media_count&access_token=${token}`;
      const fieldsRes = await fetch(fieldsUrl);
      const fieldsData = await fieldsRes.json();
      
      const insightsUrl = `https://graph.facebook.com/${apiVersion}/${igId}/insights?metric=reach&period=day&access_token=${token}`;
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();
      
      const followers = fieldsData.followers_count || 0;
      const mediaCount = fieldsData.media_count || 0;
      let reach = 0;
      const reachMetric = insightsData.data?.find((m: any) => m.name === 'reach');
      if (reachMetric?.values?.length > 0) {
         reach = reachMetric.values[reachMetric.values.length - 1].value;
      }
      
      report.step4_single_brand_fetch = {
        brand_name: brand.brand_name,
        followers,
        media_count: mediaCount,
        reach,
        raw_fields: fieldsData,
        raw_insights: insightsData
      };

      // 5 & 6. Show inserted row in daily_metrics
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        brand_id: brand.id,
        metric_date: today,
        followers,
        reach,
        media_count: mediaCount
      };
      
      const { data: insertResult, error: insertError } = await client
        .from('daily_metrics')
        .upsert(payload, { onConflict: 'brand_id,metric_date' })
        .select();
        
      report.step6_inserted_row = {
        result: insertResult,
        error: insertError
      };
    }
  } catch (error: any) {
    report.fatal_error = error.message;
  }

  return NextResponse.json(report);
}
