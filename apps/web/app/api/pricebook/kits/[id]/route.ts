import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/kits/${params.id}`, {
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch kit' }, { status: res.status });
    }
    
    const kit = await res.json();
    
    // Transform to camelCase
    return NextResponse.json({
      id: kit.id,
      tenantId: kit.tenant_id,
      name: kit.name,
      description: kit.description,
      categoryPath: kit.category_path ? kit.category_path.split('.') : [],
      createdAt: kit.created_at,
      updatedAt: kit.updated_at,
      groups: (kit.groups || []).map((g: any) => ({
        id: g.id,
        kitId: g.kit_id,
        name: g.name,
        color: g.color,
        collapsed: g.collapsed,
        sortOrder: g.sort_order,
      })),
      items: kit.items || [],
      includedKitIds: kit.includedKitIds || [],
    });
  } catch (error) {
    console.error('Failed to fetch kit:', error);
    return NextResponse.json({ error: 'Failed to fetch kit' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/kits/${params.id}`, {
      method: 'PUT',
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
    console.error('Failed to update kit:', error);
    return NextResponse.json({ error: 'Failed to update kit' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/kits/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to delete kit:', error);
    return NextResponse.json({ error: 'Failed to delete kit' }, { status: 500 });
  }
}
