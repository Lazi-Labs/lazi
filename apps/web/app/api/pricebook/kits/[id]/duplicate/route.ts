import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/kits/${params.id}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to duplicate kit:', error);
    return NextResponse.json({ error: 'Failed to duplicate kit' }, { status: 500 });
  }
}
