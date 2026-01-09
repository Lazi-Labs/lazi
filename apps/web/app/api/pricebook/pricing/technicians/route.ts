import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

export async function GET() {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/pricing/technicians?includeInactive=true`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Technicians GET error:', error);
    return NextResponse.json({ data: null, error: 'Failed to fetch technicians' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${PRICING_API_URL}/api/pricing/technicians`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Technicians POST error:', error);
    return NextResponse.json({ data: null, error: 'Failed to create technician' }, { status: 503 });
  }
}
