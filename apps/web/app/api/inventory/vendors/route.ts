import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active') || 'true';
    
    const res = await fetch(`${ST_AUTOMATION_URL}/inventory/vendors?active=${active}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch vendors:', res.status);
      return NextResponse.json({ data: [] });
    }
    
    const data = await res.json();
    
    // Transform to consistent format
    const vendors = (data.data || data || []).map((v: any) => ({
      id: v.id?.toString(),
      vendorId: v.id,
      vendorName: v.name || v.vendorName || '',
      active: v.active ?? true,
    }));
    
    return NextResponse.json({ data: vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ data: [] });
  }
}
