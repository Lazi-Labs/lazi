import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

// GET /pricebook/pricing/api/vehicles - List all vehicles
export async function GET() {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/vehicles`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch vehicles' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vehicles API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}

// POST /pricebook/pricing/api/vehicles - Create vehicle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${PRICING_API_URL}/api/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create vehicle' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vehicles API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}
