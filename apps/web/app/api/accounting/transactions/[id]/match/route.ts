import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://lazi-api:3001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const response = await fetch(
      `${API_URL}/accounting/transactions/${id}/match`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error matching transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to match transaction' },
      { status: 500 }
    );
  }
}
