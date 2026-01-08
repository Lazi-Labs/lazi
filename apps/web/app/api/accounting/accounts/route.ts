import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_INTERNAL_API_URL || process.env.API_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

    const response = await fetch(
      `${API_URL}/accounting/gl-accounts`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching GL accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GL accounts' },
      { status: 500 }
    );
  }
}
