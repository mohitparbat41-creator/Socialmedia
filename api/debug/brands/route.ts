import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey);

  const { data: brands, error } = await client
    .from('brands')
    .select('brand_name, facebook_page_id, instagram_business_id');

  return NextResponse.json({ brands, error });
}
