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
    
    const res = await fetch(`${ST_AUTOMATION_URL}/pricebook/equipment?${params}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    
    if (!res.ok) {
      console.error('Failed to fetch equipment from ST Automation:', res.status);
      return NextResponse.json([], { status: 200 });
    }
    
    const data = await res.json();
    const equipment = data.data || data || [];
    
    // Transform to expected format - handle both camelCase and snake_case from DB
    const transformed = equipment.map((eq: any) => ({
      id: eq.id?.toString() || eq.st_id?.toString(),
      stId: eq.st_id?.toString() || eq.id?.toString(),
      code: eq.code || '',
      name: eq.name || eq.displayName || eq.display_name || '',
      displayName: eq.displayName || eq.display_name || eq.name || '',
      description: eq.description || '',
      manufacturer: eq.manufacturer || '',
      modelNumber: eq.modelNumber || eq.model_number || '',
      cost: eq.cost || 0,
      price: eq.price || 0,
      memberPrice: eq.memberPrice || eq.member_price || 0,
      warrantyYears: eq.warrantyYears || eq.warranty_years || 0,
      active: eq.active ?? true,
      taxable: eq.taxable ?? true,
      categoryIds: eq.categories || eq.category_ids || [],
      defaultImageUrl: eq.defaultAssetUrl || eq.default_asset_url || eq.image_url
        ? `/api/images/db/equipment/${eq.st_id || eq.id}`
        : null,
      primaryVendor: eq.primaryVendor || eq.primary_vendor || null,
      vendors: eq.vendors || eq.otherVendors || eq.other_vendors || [],
    }));
    
    return NextResponse.json(transformed);
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
