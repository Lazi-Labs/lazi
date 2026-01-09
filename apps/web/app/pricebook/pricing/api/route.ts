import { NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

// GET /pricebook/pricing/api - Get all pricing data
export async function GET() {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/pricing`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch pricing data' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to connect to pricing service' },
      { status: 503 }
    );
  }
}
