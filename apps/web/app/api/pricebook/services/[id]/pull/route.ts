import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    // Forward to ST Automation services pull endpoint
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/services/${id}/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to pull service from ServiceTitan:', res.status, errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to pull from ServiceTitan', details: errorText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error pulling service from ServiceTitan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to pull from ServiceTitan' },
      { status: 500 }
    );
  }
}
