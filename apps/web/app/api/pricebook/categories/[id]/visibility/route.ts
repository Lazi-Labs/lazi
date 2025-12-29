import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  const { visible, cascade } = body;

  try {
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/categories/${id}/visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': DEFAULT_TENANT_ID,
      },
      body: JSON.stringify({ visible, cascade }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update visibility' }));
      return NextResponse.json({ success: false, error: error.message }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      categoryId: id,
      visible,
      data,
    });
  } catch (error) {
    console.error('Failed to update visibility:', error);
    return NextResponse.json({ success: false, error: 'Failed to update visibility' }, { status: 500 });
  }
}
