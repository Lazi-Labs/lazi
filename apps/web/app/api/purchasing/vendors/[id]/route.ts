import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.ST_AUTOMATION_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const res = await fetch(`${ST_AUTOMATION_URL}/inventory/vendors/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    const data = await res.json();
    const v = data.data || data;
    
    // Transform from ServiceTitan inventory/vendors response
    const vendor = {
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
    };
    
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Failed to fetch vendor:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const body = await request.json();
    
    const res = await fetch(`${ST_AUTOMATION_URL}/inventory/vendors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update vendor:', error);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const res = await fetch(`${ST_AUTOMATION_URL}/inventory/vendors/${id}`, {
      method: 'DELETE',
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete vendor:', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
