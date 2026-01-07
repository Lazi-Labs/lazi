import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const categoryPath = searchParams.get('categoryPath');
  
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryPath) params.set('categoryPath', categoryPath);
    
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/kits?${params}`, {
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch kits:', res.status);
      return NextResponse.json({ data: [], total: 0 });
    }
    
    const result = await res.json();
    
    // Transform to camelCase
    const transformed = (result.data || []).map((kit: any) => ({
      id: kit.id,
      tenantId: kit.tenant_id,
      name: kit.name,
      description: kit.description,
      categoryPath: kit.category_path ? kit.category_path.split('.') : [],
      createdAt: kit.created_at,
      updatedAt: kit.updated_at,
      itemCount: parseInt(kit.item_count) || 0,
      groupCount: parseInt(kit.group_count) || 0,
    }));
    
    return NextResponse.json({
      data: transformed,
      total: result.total || transformed.length,
    });
  } catch (error) {
    console.error('Failed to fetch kits:', error);
    return NextResponse.json({ data: [], total: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/kits`, {
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
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to create kit:', error);
    return NextResponse.json({ error: 'Failed to create kit' }, { status: 500 });
  }
}
