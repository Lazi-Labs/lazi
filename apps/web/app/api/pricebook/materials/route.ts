import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('pageSize') || '25';
  const active = searchParams.get('active');
  const costMin = searchParams.get('costMin');
  const costMax = searchParams.get('costMax');
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  const hasImages = searchParams.get('hasImages');
  const vendor = searchParams.get('vendor');
  
  try {
    const params = new URLSearchParams({ page, pageSize });
    
    if (search) params.set('search', search);
    if (category) params.set('category_id', category);
    if (active) params.set('active', active);
    if (costMin) params.set('costMin', costMin);
    if (costMax) params.set('costMax', costMax);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (hasImages) params.set('hasImages', hasImages);
    if (vendor) params.set('vendor', vendor);
    
    // Get tenant ID from request headers or use default
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    // Use consolidated API endpoint with CRM override support
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/materials?${params}`, {
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store', // Disable caching to ensure filters work correctly
    });
    
    if (!res.ok) {
      console.error('Failed to fetch materials from ST Automation:', res.status);
      return NextResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false });
    }
    
    const result = await res.json();
    const materials = result.data || [];
    
    // Transform from snake_case backend to camelCase frontend
    const transformed = materials.map((mat: any) => {
      const stId = mat.st_id || mat.id;
      return {
        id: mat.id?.toString() || stId?.toString(),
        stId: stId?.toString(),
        code: mat.code || '',
        name: mat.name || mat.display_name || '',
        displayName: mat.display_name || mat.name || '',
        description: mat.description || '',
        cost: parseFloat(mat.cost) || 0,
        price: parseFloat(mat.price) || 0,
        memberPrice: parseFloat(mat.member_price) || 0,
        addOnPrice: parseFloat(mat.add_on_price) || 0,
        margin: 0,
        active: mat.active ?? true,
        taxable: mat.taxable ?? true,
        unitOfMeasure: mat.unit_of_measure || '',
        categoryIds: mat.categories || [],
        defaultImageUrl: mat.image_url 
          ? (mat.image_url.startsWith('http') ? mat.image_url : `/dashboard/api/images/db/materials/${stId}`)
          : null,
        primaryVendor: mat.primary_vendor || null,
        vendors: mat.other_vendors || [],
        account: mat.account || '',
        overrideId: mat.override_id,
        hasPendingChanges: mat.has_pending_changes || false,
        internalNotes: mat.internal_notes,
        preferredVendor: mat.preferred_vendor,
        reorderThreshold: mat.reorder_threshold,
        customTags: mat.custom_tags || [],
      };
    });
    
    return NextResponse.json({
      data: transformed,
      totalCount: result.total || transformed.length,
      page: result.page || parseInt(page),
      pageSize: result.limit || parseInt(pageSize),
      hasMore: (result.page || 1) < (result.totalPages || 1),
    });
  } catch (error) {
    console.error('Failed to fetch materials:', error);
    return NextResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/materials`, {
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
    console.error('Failed to create material:', error);
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
