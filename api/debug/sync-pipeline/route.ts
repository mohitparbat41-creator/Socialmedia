import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey);
  const token = process.env.META_ACCESS_TOKEN;
  const apiVersion = process.env.META_API_VERSION || 'v19.0';

  const report: any = {};

  // 1. Verify database state
  const { count: brandsCount } = await client.from('brands').select('*', { count: 'exact', head: true });
  const { count: metricsCount } = await client.from('daily_metrics').select('*', { count: 'exact', head: true });
  const { data: brandsState } = await client.from('brands').select('brand_name, instagram_business_id');

  report.step1_database_state = {
    brands_count: brandsCount,
    daily_metrics_count: metricsCount,
    brands_data: brandsState
  };

  // 2. Verify sync eligibility
  const { data: eligibleBrands } = await client
    .from('brands')
    .select('id, brand_name, instagram_business_id')
    .not('instagram_business_id', 'is', null);

  report.step2_sync_eligibility = {
    returned_rows: eligibleBrands?.length || 0,
    data: eligibleBrands
  };

  // 3 & 4 & 5 & 7. Detailed trace for first eligible brand
  report.step4_meta_requests = {};
  report.step5_insert_operation = {};
  report.step7_failure_point = null;

  if (eligibleBrands && eligibleBrands.length > 0) {
    const brand = eligibleBrands[0];
    const igId = brand.instagram_business_id;
    const today = new Date().toISOString().split('T')[0];

    report.step4_meta_requests.instagram_business_id_used = igId;
    
    // Simulate Fields Request
    const fieldsUrl = `https://graph.facebook.com/${apiVersion}/${igId}?fields=followers_count,media_count&access_token=${token}`;
    report.step4_meta_requests.fields_url_used = fieldsUrl.replace(token!, 'HIDDEN_TOKEN');
    
    try {
      const fieldsRes = await fetch(fieldsUrl);
      const fieldsData = await fieldsRes.json();
      report.step4_meta_requests.fields_response = fieldsData;
      
      if (!fieldsRes.ok) {
        report.step7_failure_point = 'B. Meta API request (Fields)';
        throw new Error(`Fields API failed: ${fieldsData.error?.message || JSON.stringify(fieldsData)}`);
      }

      // Simulate Insights Request
      const insightsUrl = `https://graph.facebook.com/${apiVersion}/${igId}/insights?metric=reach&period=day&access_token=${token}`;
      report.step4_meta_requests.insights_url_used = insightsUrl.replace(token!, 'HIDDEN_TOKEN');
      
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();
      report.step4_meta_requests.insights_response = insightsData;
      
      if (!insightsRes.ok) {
         report.step7_failure_point = 'B. Meta API request (Insights)';
         throw new Error(`Insights API failed: ${insightsData.error?.message || JSON.stringify(insightsData)}`);
      }

      // Parsing
      const followers = fieldsData.followers_count || 0;
      const mediaCount = fieldsData.media_count || 0;
      let reach = 0;
      const reachMetric = insightsData.data?.find((m: any) => m.name === 'reach');
      if (reachMetric?.values?.length > 0) {
         reach = reachMetric.values[reachMetric.values.length - 1].value;
      }
      
      report.step4_meta_requests.parsed_followers = followers;
      report.step4_meta_requests.parsed_media_count = mediaCount;
      report.step4_meta_requests.parsed_reach = reach;

      // Simulate Insert
      const payload = {
        brand_id: brand.id,
        metric_date: today,
        followers: followers,
        reach: reach,
        media_count: mediaCount
      };
      
      report.step5_insert_operation.payload = payload;
      
      const { data: insertResult, error: insertError } = await client
        .from('daily_metrics')
        .upsert(payload, { onConflict: 'brand_id,metric_date' })
        .select();
        
      report.step5_insert_operation.result = insertResult;
      report.step5_insert_operation.error = insertError;
      
      if (insertError) {
        report.step7_failure_point = 'E. Supabase insert';
      }

    } catch (e: any) {
      if (!report.step7_failure_point) report.step7_failure_point = 'C. response parsing or D. data transformation';
      report.step7_error_details = e.message;
    }
  } else {
    report.step7_failure_point = 'A. brands query (No eligible brands found)';
  }

  // 6. Verify table after sync
  const { data: finalTableState } = await client
    .from('daily_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  report.step6_table_after_sync = finalTableState;

  return NextResponse.json(report);
}
