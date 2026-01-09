import { NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

export async function GET() {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/pricing/calculate`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Calculate GET error:', error);
    return NextResponse.json({ data: null, error: 'Failed to calculate pricing' }, { status: 503 });
  }
}
