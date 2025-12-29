import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/materials/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch material:', res.status, await res.text());
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }
    
    const data = await res.json();
    
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
      cost: parseFloat(data.cost) || 0,
      price: parseFloat(data.price) || 0,
      memberPrice: parseFloat(data.member_price) || 0,
      addOnPrice: parseFloat(data.add_on_price) || 0,
      active: data.active ?? true,
      taxable: data.taxable ?? false,
      unitOfMeasure: data.unit_of_measure || '',
      account: data.account || '',
      categories: (data.categories || []).map((cat: any) => ({
        id: cat.st_id || cat.id,
        name: cat.name,
        path: cat.name,
      })),
      primaryVendor: data.primary_vendor ? {
        id: data.primary_vendor.vendorId?.toString(),
        vendorName: data.primary_vendor.vendorName || data.primary_vendor.vendor_name || '',
        vendorId: data.primary_vendor.vendorId || data.primary_vendor.vendor_id,
        cost: parseFloat(data.primary_vendor.cost) || 0,
        vendorPart: data.primary_vendor.vendorPart || data.primary_vendor.vendor_part || '',
        preferred: true,
        active: true,
      } : null,
      vendors: (data.other_vendors || []).map((v: any) => ({
        id: v.vendorId?.toString() || v.vendor_id?.toString(),
        vendorName: v.vendorName || v.vendor_name || '',
        vendorId: v.vendorId || v.vendor_id,
        cost: parseFloat(v.cost) || 0,
        vendorPart: v.vendorPart || v.vendor_part || '',
        preferred: false,
        active: true,
      })),
      defaultImageUrl: transformImageUrl(data.s3_image_url || data.image_url),
      overrideId: data.override_id,
      hasPendingChanges: data.has_pending_changes || false,
      internalNotes: data.internal_notes,
      preferredVendor: data.override_preferred_vendor || data.preferred_vendor,
      reorderThreshold: data.reorder_threshold,
      customTags: data.custom_tags || [],
    };
    
    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching material:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const tenantId = request.headers.get('x-tenant-id') || '3222348440';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/materials/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      throw new Error('Failed to update material');
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating material:', error);
    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    );
  }
}
