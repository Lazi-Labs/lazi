import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_INTERNAL_API_URL || 'http://lazi-api:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    // Forward to backend pricebook images upload-file endpoint
    const res = await fetch(`${API_URL}/pricebook/images/upload-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to upload image file:', error);
    return NextResponse.json({ error: 'Failed to upload image file' }, { status: 500 });
  }
}
