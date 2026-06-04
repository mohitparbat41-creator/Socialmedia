import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const igAccountId = '17841473329563678';
  const apiVersion = process.env.META_API_VERSION || 'v19.0';

  if (!token) {
    return NextResponse.json(
      { error: 'Server configuration error. Missing Meta access token.' },
      { status: 500 }
    );
  }

  const baseUrl = `https://graph.facebook.com/${apiVersion}/${igAccountId}`;
  
  const fieldsToTest = [
    'followers_count',
    'media_count'
  ];

  const metricsToTest = [
    'reach',
    'impressions',
    'profile_views'
  ];

  const results: Record<string, any> = {
    fields: {},
    metrics: {}
  };

  // 1. Test standard node fields individually
  for (const field of fieldsToTest) {
    try {
      const url = `${baseUrl}?fields=${field}&access_token=${token}`;
      const safeUrl = url.replace(token, '[YOUR_ACCESS_TOKEN]');
      
      const response = await fetch(url);
      const data = await response.json();

      results.fields[field] = {
        api_url: safeUrl,
        success: response.ok,
        raw_response: data
      };
    } catch (error: any) {
      results.fields[field] = {
        success: false,
        error: error.message || 'Fetch failed'
      };
    }
  }

  // 2. Test insights metrics individually
  for (const metric of metricsToTest) {
    try {
      const url = `${baseUrl}/insights?metric=${metric}&period=day&access_token=${token}`;
      const safeUrl = url.replace(token, '[YOUR_ACCESS_TOKEN]');

      const response = await fetch(url);
      const data = await response.json();

      results.metrics[metric] = {
        api_url: safeUrl,
        success: response.ok,
        raw_response: data
      };
    } catch (error: any) {
      results.metrics[metric] = {
        success: false,
        error: error.message || 'Fetch failed'
      };
    }
  }

  return NextResponse.json({
    message: "Instagram Account Debugger",
    igAccountId,
    results
  });
}
