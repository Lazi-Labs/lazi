import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.ST_AUTOMATION_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('pageSize') || '100';
  const showInactive = searchParams.get('showInactive') === 'true';
  
  try {
    const params = new URLSearchParams({ page, pageSize });
    if (search) params.set('search', search);
    if (showInactive) params.set('active', 'false');
    
    // Fetch from inventory/vendors endpoint (ServiceTitan vendors)
    const res = await fetch(`${ST_AUTOMATION_URL}/inventory/vendors?${params}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });
    
    if (!res.ok) {
      console.error('Failed to fetch vendors from ST Automation:', res.status);
      return NextResponse.json([], { status: 200 });
    }
    
    const data = await res.json();
    const vendors = data.data || data || [];
    
    // Transform to expected format - mapping from ServiceTitan inventory/vendors response
    const transformed = vendors.map((v: any) => ({
      id: v.id?.toString(),
      stId: v.id?.toString(),
      name: v.name?.trim() || '',
      email: v.contactInfo?.email || '',
      phone: v.contactInfo?.phone || '',
      address: v.address?.street || '',
      address2: v.address?.unit || '',
      city: v.address?.city || '',
      state: v.address?.state || '',
      zip: v.address?.zip || '',
      country: v.address?.country || 'USA',
      active: v.active ?? true,
      isFavorite: false,
      isReplenishmentVendor: v.isTruckReplenishment || false,
      isMobileCreationRestricted: v.isMobileCreationRestricted || false,
      contactFirstName: v.contactInfo?.firstName || '',
      contactLastName: v.contactInfo?.lastName || '',
      contactPhone: v.contactInfo?.phone || '',
      contactEmail: v.contactInfo?.email || '',
      faxNumber: v.contactInfo?.fax || '',
      notes: v.memo || '',
      defaultDeliveryMethod: v.deliveryOption || 'EmailAsPdf',
      vendorPaymentTerms: 'NET30',
      defaultTaxRate: v.defaultTaxRate || 0,
      emailRecipients: [],
      createdOn: v.createdOn,
      modifiedOn: v.modifiedOn,
    }));
    
    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${ST_AUTOMATION_URL}/inventory/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create vendor:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
