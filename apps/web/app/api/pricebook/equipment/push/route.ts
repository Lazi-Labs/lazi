import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    console.log('[POST /api/pricebook/equipment/push] Pushing equipment to ServiceTitan');
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/equipment/push`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[PUSH] Non-JSON response:', res.status, text.substring(0, 500));
      return NextResponse.json(
        { error: `Backend returned non-JSON response (${res.status})` },
        { status: 502 }
      );
    }
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error('[PUSH] Backend error:', res.status, data);
      return NextResponse.json(data, { status: res.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error pushing equipment:', error);
    return NextResponse.json(
      { error: 'Failed to push equipment to ServiceTitan' },
      { status: 500 }
    );
  }
}
