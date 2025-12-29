// api/plaid/exchange-token/route.ts
// Next.js App Router API route

import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
// import { db } from '@/lib/db'; // Your database client (Payload/Prisma/etc)
// import { encrypt } from '@/lib/encryption'; // Encrypt access tokens!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { public_token, userId, tenantId, metadata } = body;

    if (!public_token || !userId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Get institution info
    const itemResponse = await plaidClient.itemGet({ access_token });
    const institutionId = itemResponse.data.item.institution_id;

    let institutionName = null;
    if (institutionId) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US'],
        });
        institutionName = instResponse.data.institution.name;
      } catch (e) {
        console.warn('Could not fetch institution name:', e);
      }
    }

    // Get accounts linked
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;

    // ============================================
    // IMPORTANT: Store in your database
    // ============================================
    // 
    // Example with Payload CMS:
    // 
    // const plaidItem = await payload.create({
    //   collection: 'plaid-items',
    //   data: {
    //     userId,
    //     tenantId,
    //     accessToken: encrypt(access_token), // ALWAYS encrypt!
    //     itemId: item_id,
    //     institutionId,
    //     institutionName,
    //     status: 'active',
    //   },
    // });
    //
    // // Store accounts
    // for (const account of accounts) {
    //   await payload.create({
    //     collection: 'plaid-accounts',
    //     data: {
    //       plaidItemId: plaidItem.id,
    //       accountId: account.account_id,
    //       name: account.name,
    //       officialName: account.official_name,
    //       type: account.type,
    //       subtype: account.subtype,
    //       mask: account.mask,
    //       currentBalance: account.balances.current,
    //       availableBalance: account.balances.available,
    //     },
    //   });
    // }

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
