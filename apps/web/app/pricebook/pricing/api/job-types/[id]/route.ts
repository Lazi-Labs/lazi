import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

// GET /pricebook/pricing/api/job-types/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/job-types/${params.id}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch job type' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Job Type API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}

// PATCH /pricebook/pricing/api/job-types/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const response = await fetch(`${PRICING_API_URL}/api/job-types/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update job type' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Job Type API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}

// DELETE /pricebook/pricing/api/job-types/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/job-types/${params.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete job type' }));
      return NextResponse.json(error, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Job Type API error:', error);
    return NextResponse.json({ error: 'Failed to connect to pricing service' }, { status: 503 });
  }
}
