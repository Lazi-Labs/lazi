import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || 'http://lazi-api:3001';
    
    // Test direct backend call
    const res = await fetch(`${ST_AUTOMATION_URL}/pricebook/db/services?limit=5&page=1&pageSize=25`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    
    const data = await res.json();
    
    return NextResponse.json({
      backendUrl: `${ST_AUTOMATION_URL}/pricebook/db/services`,
      backendStatus: res.ok ? 'OK' : 'ERROR',
      backendStatusCode: res.status,
      totalCount: data.totalCount,
      dataLength: data.data?.length || 0,
      firstService: data.data?.[0]?.name || null,
      rawResponse: data,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
