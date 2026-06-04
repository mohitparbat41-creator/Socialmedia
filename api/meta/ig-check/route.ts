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
    // Requesting both connected_instagram_account and instagram_business_account
    // to maximize the chance of retrieving the linked IG account ID.
    const url = `https://graph.facebook.com/${apiVersion}/${pageId}?fields=connected_instagram_account,instagram_business_account&access_token=${token}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Return the raw JSON response directly to the browser
    return NextResponse.json(data);
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fetch failed completely' },
      { status: 500 }
    );
  }
}
