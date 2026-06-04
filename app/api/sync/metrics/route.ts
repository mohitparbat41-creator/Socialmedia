import { NextResponse } from "next/server";
import { syncBrandMetrics } from "@/lib/meta-service";

export async function POST() {
  try {
    const result = await syncBrandMetrics();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
