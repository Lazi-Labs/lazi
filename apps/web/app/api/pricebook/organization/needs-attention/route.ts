import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/organization/needs-attention?${searchParams}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch needs-attention:', res.status);
      return NextResponse.json({ success: false, error: 'Failed to fetch needs-attention' }, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch needs-attention:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch needs-attention' }, { status: 500 });
  }
}
