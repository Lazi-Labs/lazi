import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/pricing/office-staff/${params.id}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Office staff GET error:', error);
    return NextResponse.json({ data: null, error: 'Failed to fetch office staff' }, { status: 503 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const response = await fetch(`${PRICING_API_URL}/api/pricing/office-staff/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Office staff PATCH error:', error);
    return NextResponse.json({ data: null, error: 'Failed to update office staff' }, { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/pricing/office-staff/${params.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Office staff DELETE error:', error);
    return NextResponse.json({ data: null, error: 'Failed to delete office staff' }, { status: 503 });
  }
}
