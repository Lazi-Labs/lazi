// api/plaid/exchange-token/route.ts
// Exchanges a Plaid public token for an access token and stores the connection

import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { encrypt } from '@/lib/encryption';
import { CountryCode } from 'plaid';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { public_token, userId, tenantId, metadata } = body;

    if (!public_token || !userId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields: public_token, userId, tenantId' },
        { status: 400 }
      );
    }

    // 1. Exchange public token for access token with Plaid
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // 2. Get institution info
    const itemResponse = await plaidClient.itemGet({ access_token });
    const institutionId = itemResponse.data.item.institution_id;

    let institutionName = metadata?.institution?.name || null;
    if (!institutionName && institutionId) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US'] as CountryCode[],
        });
        institutionName = instResponse.data.institution.name;
      } catch (e) {
        console.warn('Could not fetch institution name:', e);
      }
    }

    // 3. Get accounts linked
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;

    // 4. Encrypt the access token before storing
    const encryptedAccessToken = encrypt(access_token);

    // 5. Store in database via backend API
    const storeResponse = await fetch(`${ST_AUTOMATION_URL}/plaid/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        tenantId,
        accessToken: encryptedAccessToken,
        itemId: item_id,
        institutionId,
        institutionName,
        accounts: accounts.map(a => ({
          account_id: a.account_id,
          name: a.name,
          official_name: a.official_name,
          type: a.type,
          subtype: a.subtype,
          mask: a.mask,
          current_balance: a.balances.current,
          available_balance: a.balances.available,
        })),
      }),
    });

    if (!storeResponse.ok) {
      const storeError = await storeResponse.json();
      console.error('Failed to store Plaid item:', storeError);
      // Continue anyway - the token exchange succeeded
    }

    // 6. Trigger initial transaction sync (optional - webhook will also trigger this)
    try {
      await plaidClient.transactionsSync({
        access_token,
      });
      console.log('Initial transaction sync triggered for item:', item_id);
    } catch (syncError) {
      console.warn('Initial transaction sync failed (will retry via webhook):', syncError);
    }

    console.log('Plaid item created:', {
      item_id,
      institutionName,
      accountCount: accounts.length,
    });

    return NextResponse.json({
      success: true,
      item_id,
      institution: institutionName,
      accounts: accounts.map((a) => ({
        id: a.account_id,
        name: a.name,
        mask: a.mask,
        type: a.type,
        subtype: a.subtype,
      })),
    });
  } catch (error: any) {
    console.error('Error exchanging token:', error.response?.data || error);
    return NextResponse.json(
      {
        error: 'Failed to exchange token',
        details: error.response?.data?.error_message || error.message,
      },
      { status: 500 }
    );
  }
}
