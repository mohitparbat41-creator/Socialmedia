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

  const baseUrl = `https://graph.facebook.com/${apiVersion}/${pageId}`;
  
  // The metrics the user explicitly requested to test
  const metricsToTest = [
    'page_impressions',
    'page_reach',
    'page_engaged_users',
    'page_follows'
  ];

  const results: Record<string, any> = {};

  // Test each metric sequentially
  for (const metric of metricsToTest) {
    try {
      const url = `${baseUrl}/insights?metric=${metric}&period=day&access_token=${token}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        results[metric] = {
          success: false,
          status: response.status,
          error: data.error?.message || 'Unknown error',
          raw_response: data
        };
      } else {
        results[metric] = {
          success: true,
          status: response.status,
          raw_response: data
        };
      }
    } catch (error: any) {
      results[metric] = {
        success: false,
        error: error.message || 'Fetch failed completely'
      };
    }
  }

  // Return the results without processing the data
  return NextResponse.json({
    message: "Meta Graph API Metrics Debugger",
    pageId: pageId,
    results
  });
}
