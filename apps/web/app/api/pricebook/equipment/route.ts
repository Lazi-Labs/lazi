import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('pageSize') || '50';
  
  try {
    const params = new URLSearchParams({ page, pageSize });
    
    if (search) {
      params.set('search', search);
    }
    if (category) {
      params.set('categoryId', category);
    }
    
    // Get tenant ID from request headers or use default
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    
    // Use consolidated API endpoint with CRM override support
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/equipment?${params}`, {
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store', // Disable caching to ensure filters work correctly
    });
    
    if (!res.ok) {
      console.error('Failed to fetch equipment from ST Automation:', res.status);
      return NextResponse.json([], { status: 200 });
    }
    
    const result = await res.json();
    const equipment = result.data || [];
    
    // Transform from snake_case backend to camelCase frontend
    const transformed = equipment.map((eq: any) => {
      const stId = eq.st_id || eq.id;
      return {
        id: eq.id?.toString() || stId?.toString(),
        stId: stId?.toString(),
        code: eq.code || '',
        name: eq.name || eq.display_name || '',
        displayName: eq.display_name || eq.name || '',
        description: eq.description || '',
        manufacturer: eq.manufacturer || '',
        model: eq.model || '',
        cost: parseFloat(eq.cost) || 0,
        price: parseFloat(eq.price) || 0,
        memberPrice: parseFloat(eq.member_price) || 0,
        addOnPrice: parseFloat(eq.add_on_price) || 0,
        active: eq.active ?? true,
        taxable: eq.taxable ?? true,
        categoryIds: eq.categories || [],
        defaultImageUrl: eq.image_url 
          ? (eq.image_url.startsWith('http') ? eq.image_url : `/dashboard/api/images/db/equipment/${stId}`)
          : null,
        primaryVendor: eq.primary_vendor || null,
        vendors: eq.other_vendors || [],
        manufacturerWarranty: eq.manufacturer_warranty || null,
        serviceWarranty: eq.service_warranty || null,
        account: eq.account || '',
        overrideId: eq.override_id,
        hasPendingChanges: eq.has_pending_changes || false,
        internalNotes: eq.internal_notes,
        preferredVendor: eq.preferred_vendor,
        customTags: eq.custom_tags || [],
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
    console.error('Failed to fetch equipment:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const equipment = {
      id: crypto.randomUUID(),
      ...body,
    };
    
    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Failed to create equipment:', error);
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 });
  }
}
