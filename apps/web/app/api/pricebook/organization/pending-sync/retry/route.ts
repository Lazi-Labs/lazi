import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/organization/pending-sync/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to retry pending sync:', res.status, errorText);
      return NextResponse.json({ success: false, error: 'Failed to retry pending sync' }, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to retry pending sync:', error);
    return NextResponse.json({ success: false, error: 'Failed to retry pending sync' }, { status: 500 });
  }
}
