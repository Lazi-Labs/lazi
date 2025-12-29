import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

export async function POST(request: NextRequest) {
  try {
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/categories/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': DEFAULT_TENANT_ID,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to trigger sync' }));
      return NextResponse.json({ success: false, error: error.message }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      message: 'Sync triggered successfully',
      data,
    });
  } catch (error) {
    console.error('Failed to trigger sync:', error);
    return NextResponse.json({ success: false, error: 'Failed to trigger sync' }, { status: 500 });
  }
}
