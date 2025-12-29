import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || DEFAULT_TENANT_ID;

  try {
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/categories/pending`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch pending overrides:', res.status);
      return NextResponse.json({ data: [], count: 0, categories: 0, subcategories: 0 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch pending overrides:', error);
    return NextResponse.json({ data: [], count: 0, categories: 0, subcategories: 0 });
  }
}
