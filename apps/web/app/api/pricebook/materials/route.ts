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
    if (category) params.set('categoryId', category);
    if (active) params.set('active', active);
    if (costMin) params.set('costMin', costMin);
    if (costMax) params.set('costMax', costMax);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (hasImages) params.set('hasImages', hasImages);
    if (vendor) params.set('vendor', vendor);
    
    // Use database-backed endpoint for better filtering
    const res = await fetch(`${ST_AUTOMATION_URL}/pricebook/db/materials?${params}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', // Disable caching to ensure filters work correctly
    });
    
    if (!res.ok) {
      console.error('Failed to fetch materials from ST Automation:', res.status);
      return NextResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false });
    }
    
    const data = await res.json();
    const materials = data.data || data || [];
    
    // Transform to expected format
    const transformed = materials.map((mat: any) => {
      const stId = mat.stId || mat.st_id || mat.id;
      const hasImage = mat.defaultAssetUrl || mat.default_asset_url || (mat.assets && mat.assets.length > 0);
      return {
        id: mat.id?.toString() || stId?.toString(),
        stId: stId?.toString(),
        code: mat.code || '',
        name: mat.name || mat.displayName || mat.display_name || '',
        displayName: mat.displayName || mat.display_name || mat.name || '',
        description: mat.description || '',
        cost: mat.cost || 0,
        price: mat.price || 0,
        memberPrice: mat.memberPrice || mat.member_price || 0,
        margin: mat.margin || 0,
        active: mat.active ?? true,
        taxable: mat.taxable ?? true,
        categoryIds: mat.categories || mat.category_ids || [],
        defaultImageUrl: hasImage ? `/api/images/db/materials/${stId}` : null,
        primaryVendor: mat.primaryVendor || mat.primary_vendor || null,
        vendors: mat.vendors || mat.otherVendors || mat.other_vendors || [],
        trackStock: mat.trackStock || mat.track_stock || false,
        chargeableByDefault: mat.chargeableByDefault || mat.chargeable_by_default || true,
      };
    });
    
    return NextResponse.json({
      data: transformed,
      totalCount: data.totalCount || transformed.length,
      page: data.page || parseInt(page),
      pageSize: data.pageSize || parseInt(pageSize),
      hasMore: data.hasMore || false,
    });
  } catch (error) {
    console.error('Failed to fetch materials:', error);
    return NextResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const material = {
      id: crypto.randomUUID(),
      ...body,
    };
    
    return NextResponse.json(material);
  } catch (error) {
    console.error('Failed to create material:', error);
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
