import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/pricing/vehicles/${params.id}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vehicle GET error:', error);
    return NextResponse.json({ data: null, error: 'Failed to fetch vehicle' }, { status: 503 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const response = await fetch(`${PRICING_API_URL}/api/pricing/vehicles/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Vehicle PATCH error:', error);
    return NextResponse.json({ data: null, error: 'Failed to update vehicle' }, { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/pricing/vehicles/${params.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Vehicle DELETE error:', error);
    return NextResponse.json({ data: null, error: 'Failed to delete vehicle' }, { status: 503 });
  }
}
