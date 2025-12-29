// api/plaid/create-link-token/route.ts
// Next.js App Router API route

import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES, PLAID_LINK_CONFIG } from '@/lib/plaid';
import { CountryCode, Products } from 'plaid';

export async function POST(request: NextRequest) {
  try {
    // Get user from session/auth (adjust based on your auth system)
    const body = await request.json();
    const { userId, tenantId } = body;

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing userId or tenantId' },
        { status: 400 }
      );
    }

    // Create a unique client_user_id (combine tenant + user for multi-tenant)
    const clientUserId = `${tenantId}_${userId}`;

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: clientUserId,
      },
      client_name: 'LAZI AI',
      products: PLAID_PRODUCTS as Products[],
      country_codes: PLAID_COUNTRY_CODES as CountryCode[],
      language: PLAID_LINK_CONFIG.language,
      webhook: PLAID_LINK_CONFIG.webhook,
      // OAuth redirect URI (required for OAuth banks)
      redirect_uri: process.env.PLAID_REDIRECT_URI || undefined,
    });

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error: any) {
    console.error('Error creating link token:', error.response?.data || error);
    return NextResponse.json(
      { 
        error: 'Failed to create link token',
        details: error.response?.data?.error_message || error.message 
      },
      { status: 500 }
    );
  }
}
