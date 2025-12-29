import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('pageSize') || '25';
  const active = searchParams.get('active');
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  const hoursMin = searchParams.get('hoursMin');
  const hoursMax = searchParams.get('hoursMax');
  const description = searchParams.get('description');
  const hasImages = searchParams.get('hasImages');
  const hasMaterials = searchParams.get('hasMaterials');
  const hasEquipment = searchParams.get('hasEquipment');
  
  try {
    // Build params for database-backed endpoint
    const params = new URLSearchParams({ page, pageSize });
    
    if (search) params.set('search', search);
    if (category) params.set('categoryId', category);
    if (active) params.set('active', active);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (hoursMin) params.set('hoursMin', hoursMin);
    if (hoursMax) params.set('hoursMax', hoursMax);
    if (description) params.set('description', description);
    if (hasImages) params.set('hasImages', hasImages);
    if (hasMaterials) params.set('hasMaterials', hasMaterials);
    if (hasEquipment) params.set('hasEquipment', hasEquipment);
    
    // Get tenant ID from request headers or use default
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    // Use consolidated API endpoint with CRM override support
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/services?${params}`, {
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store', // Disable caching to ensure fresh data with filters
    });
    
    if (!res.ok) {
      console.error('Failed to fetch services from ST Automation:', res.status);
      return NextResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false });
    }
    
    const result = await res.json();
    const services = result.data || [];
    
    // Transform from snake_case backend to camelCase frontend
    const transformed = services.map((svc: any) => ({
      id: svc.id?.toString() || svc.st_id?.toString(),
      stId: svc.st_id?.toString() || svc.id?.toString(),
      code: svc.code || '',
      name: svc.name || svc.display_name || '',
      displayName: svc.display_name || svc.name || '',
      description: svc.description || '',
      price: parseFloat(svc.price) || 0,
      memberPrice: parseFloat(svc.member_price) || 0,
      addOnPrice: parseFloat(svc.add_on_price) || 0,
      memberAddOnPrice: parseFloat(svc.member_add_on_price) || 0,
      durationHours: parseFloat(svc.hours) || 0,
      active: svc.active ?? true,
      taxable: svc.taxable ?? true,
      warranty: svc.warranty || '',
      categoryIds: svc.categories || [],
      categoryStId: svc.category_st_id,
      defaultImageUrl: svc.image_url 
        ? (svc.image_url.startsWith('http') ? svc.image_url : `/dashboard/api/images/db/services/${svc.st_id}`)
        : null,
      laborCost: parseFloat(svc.cost) || 0,
      materialCost: 0,
      bonus: 0,
      account: svc.account || '',
      isLabor: svc.is_labor || false,
      overrideId: svc.override_id,
      hasPendingChanges: svc.has_pending_changes || false,
      internalNotes: svc.internal_notes,
      customTags: svc.custom_tags || [],
    }));
    
    return NextResponse.json({
      data: transformed,
      totalCount: result.total || transformed.length,
      page: result.page || parseInt(page),
      pageSize: result.limit || parseInt(pageSize),
      hasMore: (result.page || 1) < (result.totalPages || 1),
    });
  } catch (error) {
    console.error('Failed to fetch services:', error);
    return NextResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Would integrate with ST Automation to create service
    const service = {
      id: crypto.randomUUID(),
      ...body,
    };
    
    return NextResponse.json(service);
  } catch (error) {
    console.error('Failed to create service:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
