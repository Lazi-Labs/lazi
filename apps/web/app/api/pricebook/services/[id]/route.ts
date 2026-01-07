import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get tenant ID from request headers or use default
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    // Fetch from ST Automation consolidated endpoint for full service details
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/services/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch service from DB:', res.status, await res.text());
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    const data = await res.json();
    
    // Transform image URLs - use directly if S3/http, otherwise proxy through frontend
    const transformImageUrl = (url: string | null): string | null => {
      if (!url) return null;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `/dashboard/api${url}`;
    };

    // Transform from snake_case backend to camelCase frontend
    const transformed = {
      id: data.id?.toString(),
      stId: data.st_id?.toString(),
      code: data.code || '',
      name: data.name || data.display_name || '',
      displayName: data.display_name || data.name || '',
      description: data.description || '',
      warranty: data.warranty?.description || '',
      price: parseFloat(data.price) || 0,
      memberPrice: parseFloat(data.member_price) || 0,
      addOnPrice: parseFloat(data.add_on_price) || 0,
      memberAddOnPrice: parseFloat(data.member_add_on_price) || 0,
      durationHours: parseFloat(data.hours) || 0,
      active: data.active ?? true,
      taxable: data.taxable ?? false,
      account: data.account || '',
      categories: (data.categories || []).map((cat: any) => ({
        id: cat.st_id || cat.id,
        name: cat.name,
        path: cat.name,
      })),
      materials: (data.materials || []).map((m: any) => ({
        id: m.id?.toString() || m.st_id?.toString(),
        materialId: m.st_id?.toString(),
        code: m.code || '',
        name: m.name || '',
        description: m.description || '',
        quantity: m.quantity || 1,
        unitCost: parseFloat(m.cost) || 0,
        vendorName: m.vendor_name || m.primary_vendor || '',
        imageUrl: transformImageUrl(m.image_url),
      })),
      equipment: (data.equipment || []).map((e: any) => ({
        id: e.id?.toString() || e.st_id?.toString(),
        equipmentId: e.st_id?.toString(),
        code: e.code || '',
        name: e.name || '',
        description: e.description || '',
        quantity: e.quantity || 1,
        unitCost: parseFloat(e.cost) || 0,
        vendorName: e.vendor_name || e.primary_vendor || '',
        imageUrl: transformImageUrl(e.image_url),
      })),
      upgrades: data.upgrades || [],
      recommendations: data.recommendations || [],
      defaultImageUrl: transformImageUrl(data.s3_image_url || data.image_url),
      image_url: transformImageUrl(data.s3_image_url || data.image_url),
    };
    
    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    // Forward to ST Automation service
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/services/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to update service:', res.status, errorText);
      return NextResponse.json(
        { error: 'Failed to update service', details: errorText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Forward to ST Automation service
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/services/${id}`, {
      method: 'DELETE',
    });
    
    if (!res.ok) {
      throw new Error('Failed to delete service');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
