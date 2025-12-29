import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || process.env.NEXT_INTERNAL_API_URL || 'http://lazi-api:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/plaid/transactions/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync transactions' },
      { status: 500 }
    );
  }
}
