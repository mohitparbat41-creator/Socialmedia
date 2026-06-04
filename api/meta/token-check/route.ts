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
    // Calling /me directly to check the token's root identity
    const url = `https://graph.facebook.com/${apiVersion}/me?access_token=${token}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Return the raw response directly without processing
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      raw_meta_response: data
    }, { status: response.ok ? 200 : response.status });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Fetch failed completely' },
      { status: 500 }
    );
  }
}
