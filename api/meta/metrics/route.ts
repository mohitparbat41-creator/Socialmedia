import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const apiVersion = process.env.META_API_VERSION || 'v19.0';

  if (!token || !pageId) {
    return NextResponse.json(
      { error: 'Server configuration error. Missing Meta API credentials.' },
      { status: 500 }
    );
  }

  try {
    const baseUrl = `https://graph.facebook.com/${apiVersion}/${pageId}`;
    
    // 1. Fetch Followers (fan_count for Facebook Pages)
    const pageResponse = await fetch(`${baseUrl}?fields=followers_count,fan_count&access_token=${token}`);
    
    if (!pageResponse.ok) {
      const errorData = await pageResponse.json();
      throw new Error(errorData.error?.message || 'Failed to fetch page data from Meta API');
    }
    
    const pageData = await pageResponse.json();
    const followers = pageData.followers_count || pageData.fan_count || 0;

    // 2. Fetch Insights (Reach, Impressions, Engagement)
    // - page_impressions_unique = Reach
    // - page_impressions = Impressions
    // - page_post_engagements = Engagement
    const insightsUrl = `${baseUrl}/insights?metric=page_impressions_unique,page_impressions,page_post_engagements&period=day&access_token=${token}`;
    const insightsResponse = await fetch(insightsUrl);
    
    if (!insightsResponse.ok) {
      const errorData = await insightsResponse.json();
      throw new Error(errorData.error?.message || 'Failed to fetch insights from Meta API');
    }
    
    const insightsData = await insightsResponse.json();
    
    // Extract values safely from the Insights API response structure
    const extractMetric = (name: string) => {
      const metric = insightsData.data?.find((m: any) => m.name === name);
      // Usually, the last value in the values array is the most recent
      return metric?.values?.[metric.values.length - 1]?.value || 0;
    };

    const reach = extractMetric('page_impressions_unique');
    const impressions = extractMetric('page_impressions');
    const engagement = extractMetric('page_post_engagements');

    // Return the clean JSON structure
    return NextResponse.json({
      success: true,
      data: {
        followers,
        reach,
        impressions,
        engagement,
      }
    });

  } catch (error: any) {
    console.error('Meta API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
