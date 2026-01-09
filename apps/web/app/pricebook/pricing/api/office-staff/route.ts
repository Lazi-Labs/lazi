import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

// GET /pricebook/pricing/api/office-staff - List all office staff
export async function GET() {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/office-staff`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch office staff' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Office Staff API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}

// POST /pricebook/pricing/api/office-staff - Create office staff
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${PRICING_API_URL}/api/office-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create office staff' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Office Staff API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}
