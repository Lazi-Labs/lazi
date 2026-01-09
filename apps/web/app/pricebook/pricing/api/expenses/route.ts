import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

// GET /pricebook/pricing/api/expenses - List all expense categories with items
export async function GET() {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/expenses`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch expenses' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Expenses API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}

// POST /pricebook/pricing/api/expenses - Create expense item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${PRICING_API_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create expense' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Expenses API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}
