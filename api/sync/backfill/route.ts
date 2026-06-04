import { NextResponse } from 'next/server';
import { backfillBrandMetrics } from '@/lib/meta-service';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brandId') || undefined;
    const days = parseInt(url.searchParams.get('days') || '30', 10);

    const result = await backfillBrandMetrics(brandId, days);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /sync/backfill] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
