import { NextRequest, NextResponse } from 'next/server';

const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:3001/api/crm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const res = await fetch(`${CRM_API_URL}/opportunities/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch opportunity from CRM API:', res.status);
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }
    
    const data = await res.json();
    return NextResponse.json(data.opportunity || data);
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunity' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const body = await request.json();
    
    const res = await fetch(`${CRM_API_URL}/opportunities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(error, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data.opportunity || data);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    // Note: Delete endpoint may need to be added to ST Automation CRM API
    const res = await fetch(`${CRM_API_URL}/opportunities/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(error, { status: res.status });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 });
  }
}
