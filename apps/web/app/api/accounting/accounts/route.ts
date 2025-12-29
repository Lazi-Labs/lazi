import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${API_URL}/accounting/accounts`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
