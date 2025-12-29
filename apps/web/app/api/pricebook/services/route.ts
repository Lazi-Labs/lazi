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
    
    // Use database-backed endpoint for better filtering
    const res = await fetch(`${ST_AUTOMATION_URL}/pricebook/db/services?${params}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', // Disable caching to ensure fresh data with filters
    });
    
    if (!res.ok) {
      console.error('Failed to fetch services from ST Automation:', res.status);
      return NextResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false });
    }
    
    const result = await res.json();
    const services = result.data || [];
    
    // Transform to expected format
    const transformed = services.map((svc: any) => ({
      id: svc.id?.toString() || svc.stId?.toString(),
      stId: svc.stId?.toString() || svc.id?.toString(),
      code: svc.code || '',
      name: svc.name || svc.displayName || '',
      displayName: svc.displayName || svc.name || '',
      description: svc.description || '',
      price: svc.price || 0,
      memberPrice: svc.memberPrice || 0,
      addOnPrice: svc.addOnPrice || 0,
      memberAddOnPrice: svc.memberAddOnPrice || 0,
      durationHours: svc.durationHours || 0,
      active: svc.active ?? true,
      taxable: svc.taxable ?? true,
      warranty: svc.warranty || '',
      categoryIds: svc.categories || [],
      defaultImageUrl: svc.defaultImageUrl 
        ? `/api${svc.defaultImageUrl}`
        : null,
      laborCost: svc.laborCost || 0,
      materialCost: svc.materialCost || 0,
      bonus: svc.bonus || 0,
      account: svc.account || '',
    }));
    
    return NextResponse.json({
      data: transformed,
      totalCount: result.totalCount || 0,
      page: result.page || parseInt(page),
      pageSize: result.pageSize || parseInt(pageSize),
      hasMore: result.hasMore || false,
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
