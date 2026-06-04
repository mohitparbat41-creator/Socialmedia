import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const apiVersion = process.env.META_API_VERSION || 'v19.0';

  if (!token) {
    return NextResponse.json(
      { error: 'Server configuration error. Missing Meta access token.' },
      { status: 500 }
    );
  }

  try {
    // Requesting both instagram fields for each page to ensure we capture the IG account
    const url = `https://graph.facebook.com/${apiVersion}/me/accounts?fields=id,name,connected_instagram_account,instagram_business_account&access_token=${token}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'Failed to fetch' }, { status: response.status });
    }

    // Map strictly to the array format requested by the user
    const results = data.data?.map((page: any) => {
      // Find the IG Business ID from either field (preferring instagram_business_account)
      const igBusinessId = page.instagram_business_account?.id 
        || page.connected_instagram_account?.id 
        || null;

      return {
        page_name: page.name,
        page_id: page.id,
        instagram_business_id: igBusinessId
      };
    }) || [];

    // Return exactly the array requested
    return NextResponse.json(results);
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fetch failed' },
      { status: 500 }
    );
  }
}
