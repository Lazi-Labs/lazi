import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Fetch from ST Automation database-backed endpoint for full service details with linked materials
    const res = await fetch(`${ST_AUTOMATION_URL}/pricebook/db/services/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });
    
    if (!res.ok) {
      console.error('Failed to fetch service from DB:', res.status, await res.text());
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    const data = await res.json();
    
    // Transform image URLs to use frontend proxy
    if (data.materials) {
      data.materials = data.materials.map((m: any) => ({
        ...m,
        imageUrl: m.imageUrl ? `/api${m.imageUrl}` : null,
      }));
    }
    if (data.equipment) {
      data.equipment = data.equipment.map((e: any) => ({
        ...e,
        imageUrl: e.imageUrl ? `/api${e.imageUrl}` : null,
      }));
    }
    if (data.defaultImageUrl) {
      data.defaultImageUrl = `/api${data.defaultImageUrl}`;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Forward to ST Automation service
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      throw new Error('Failed to update service');
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Forward to ST Automation service
    const res = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/services/${id}`, {
      method: 'DELETE',
    });
    
    if (!res.ok) {
      throw new Error('Failed to delete service');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
