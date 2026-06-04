import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const apiVersion = process.env.META_API_VERSION || 'v19.0';
  
  const tokenExists = !!token;
  
  if (!tokenExists) {
    return NextResponse.json({
      success: false,
      token_exists: tokenExists,
      exception_message: 'Missing META_ACCESS_TOKEN in environment variables.',
      full_meta_response: null
    }, { status: 500 });
  }

  // Exact URL being requested (we hide the token string in the debug output for safety)
  const url = `https://graph.facebook.com/${apiVersion}/me/accounts?fields=id,name,connected_instagram_account,instagram_business_account&access_token=${token}`;
  const displayUrl = `https://graph.facebook.com/${apiVersion}/me/accounts?fields=id,name,connected_instagram_account,instagram_business_account&access_token=[YOUR_TOKEN]`;

  try {
    const response = await fetch(url);
    
    // Read raw text first so we don't lose the response if it's not valid JSON
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError: any) {
      data = { raw_text_response: text, parse_error: parseError.message };
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        exact_url_called: displayUrl,
        token_exists: tokenExists,
        http_status_code: response.status,
        full_meta_response: data,
        exception_message: `Meta API returned HTTP status ${response.status}`
      }, { status: response.status });
    }

    // Success Path
    const formattedPages = data.data?.map((page: any) => ({
      page_name: page.name,
      page_id: page.id,
      instagram_business_account_id: page.instagram_business_account?.id || page.connected_instagram_account?.id || "None connected"
    })) || [];

    return NextResponse.json({
      success: true,
      exact_url_called: displayUrl,
      token_exists: tokenExists,
      http_status_code: response.status,
      exception_message: null,
      total_pages_found: formattedPages.length,
      extracted_pages: formattedPages,
      full_meta_response: data,
    });
    
  } catch (error: any) {
    // Catching actual network failures (e.g. DNS issues, fetch aborts)
    return NextResponse.json({
      success: false,
      exact_url_called: displayUrl,
      token_exists: tokenExists,
      http_status_code: 500,
      full_meta_response: null,
      exception_message: error.message || error.toString(),
      full_error_stack: error.stack
    }, { status: 500 });
  }
}
