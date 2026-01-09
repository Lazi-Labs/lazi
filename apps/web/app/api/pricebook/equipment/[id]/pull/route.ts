import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    console.log('[POST /api/pricebook/equipment/:id/pull] Pulling equipment:', id);
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/equipment/${id}/pull`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
    });
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[PULL] Non-JSON response:', res.status, text.substring(0, 500));
      return NextResponse.json(
        { error: `Backend returned non-JSON response (${res.status})` },
        { status: 502 }
      );
    }
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error('[PULL] Backend error:', res.status, data);
      return NextResponse.json(data, { status: res.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error pulling equipment:', error);
    return NextResponse.json(
      { error: 'Failed to pull equipment from ServiceTitan' },
      { status: 500 }
    );
  }
}
