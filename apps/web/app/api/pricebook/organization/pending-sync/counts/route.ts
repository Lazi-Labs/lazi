import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/organization/pending-sync/counts`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch pending-sync counts:', res.status);
      return NextResponse.json({ success: false, error: 'Failed to fetch pending-sync counts' }, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch pending-sync counts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch pending-sync counts' }, { status: 500 });
  }
}
