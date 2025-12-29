import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const body = await request.json();
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/categories/${id}/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': DEFAULT_TENANT_ID,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Image upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/categories/${id}/image/preview`, {
      headers: {
        'x-tenant-id': DEFAULT_TENANT_ID,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'No pending image' }, { status: 404 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await res.arrayBuffer();
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Image preview failed:', error);
    return NextResponse.json(
      { error: 'Failed to get image preview' },
      { status: 500 }
    );
  }
}
