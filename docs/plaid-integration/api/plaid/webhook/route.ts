// api/plaid/webhook/route.ts
// Next.js App Router API route for Plaid webhooks

import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { PlaidWebhookPayload } from '@/types/plaid';

// Verify webhook (recommended for production)
async function verifyWebhook(request: NextRequest): Promise<boolean> {
  // In production, verify the webhook signature
  // See: https://plaid.com/docs/api/webhooks/webhook-verification/
  // For now, we'll skip verification in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // TODO: Implement proper webhook verification
  // const plaidVerificationHeader = request.headers.get('plaid-verification');
  // const body = await request.text();
  // ... verify signature
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the webhook is from Plaid
    const isValid = await verifyWebhook(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 });
    }

    const payload: PlaidWebhookPayload = await request.json();
    const { webhook_type, webhook_code, item_id } = payload;

    console.log('Plaid webhook received:', { webhook_type, webhook_code, item_id });

    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(payload);
        break;

      case 'ITEM':
        await handleItemWebhook(payload);
        break;

      case 'AUTH':
        await handleAuthWebhook(payload);
        break;

      default:
        console.log('Unhandled webhook type:', webhook_type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleTransactionsWebhook(payload: PlaidWebhookPayload) {
  const { webhook_code, item_id, new_transactions, removed_transactions } = payload;

  switch (webhook_code) {
    case 'SYNC_UPDATES_AVAILABLE':
      // New transactions available - trigger sync
      console.log(`New transactions available for item ${item_id}`);
      await syncTransactions(item_id);
      break;

    case 'INITIAL_UPDATE':
      // Initial transaction pull complete (last 30 days)
      console.log(`Initial transactions ready for item ${item_id}: ${new_transactions} new`);
      await syncTransactions(item_id);
      break;

    case 'HISTORICAL_UPDATE':
      // Historical transactions ready (up to 24 months)
      console.log(`Historical transactions ready for item ${item_id}`);
      await syncTransactions(item_id);
      break;

    case 'TRANSACTIONS_REMOVED':
      // Some transactions were removed/modified
      console.log(`Transactions removed for item ${item_id}:`, removed_transactions);
      // Handle removed transactions in your DB
      break;

    default:
      console.log('Unhandled transactions webhook code:', webhook_code);
  }
}

async function handleItemWebhook(payload: PlaidWebhookPayload) {
  const { webhook_code, item_id, error } = payload;

  switch (webhook_code) {
    case 'ERROR':
      // Item is in an error state - user needs to re-authenticate
      console.error(`Item ${item_id} error:`, error);
      // Update item status in DB, notify user
      // await updateItemStatus(item_id, 'error', error);
      break;

    case 'PENDING_EXPIRATION':
      // User's consent is expiring soon (7 days)
      console.log(`Item ${item_id} consent expiring soon`);
      // Notify user to re-authenticate
      break;

    case 'USER_PERMISSION_REVOKED':
      // User revoked access
      console.log(`User revoked access for item ${item_id}`);
      // Mark item as revoked in DB
      break;

    default:
      console.log('Unhandled item webhook code:', webhook_code);
  }
}

async function handleAuthWebhook(payload: PlaidWebhookPayload) {
  const { webhook_code, item_id } = payload;

  switch (webhook_code) {
    case 'AUTOMATICALLY_VERIFIED':
      // Micro-deposits verified automatically
      console.log(`Auth automatically verified for item ${item_id}`);
      break;

    case 'VERIFICATION_EXPIRED':
      // Micro-deposit verification expired
      console.log(`Auth verification expired for item ${item_id}`);
      break;

    default:
      console.log('Unhandled auth webhook code:', webhook_code);
  }
}

async function syncTransactions(itemId: string) {
  // ============================================
  // Sync transactions using Transactions Sync API
  // ============================================
  //
  // 1. Look up the item in your database to get access_token
  // 2. Call plaidClient.transactionsSync() with the stored cursor
  // 3. Store new/modified transactions, remove deleted ones
  // 4. Update the cursor for next sync
  //
  // Example:
  //
  // const item = await db.plaidItem.findUnique({ where: { itemId } });
  // const accessToken = decrypt(item.accessToken);
  //
  // let cursor = item.cursor;
  // let hasMore = true;
  //
  // while (hasMore) {
  //   const response = await plaidClient.transactionsSync({
  //     access_token: accessToken,
  //     cursor: cursor || undefined,
  //   });
  //
  //   const { added, modified, removed, next_cursor, has_more } = response.data;
  //
  //   // Process transactions
  //   for (const txn of added) {
  //     await db.transaction.create({ data: mapPlaidTransaction(txn) });
  //   }
  //   for (const txn of modified) {
  //     await db.transaction.update({ where: { plaidId: txn.transaction_id }, data: mapPlaidTransaction(txn) });
  //   }
  //   for (const txnId of removed) {
  //     await db.transaction.delete({ where: { plaidId: txnId } });
  //   }
  //
  //   cursor = next_cursor;
  //   hasMore = has_more;
  // }
  //
  // // Save cursor for next sync
  // await db.plaidItem.update({ where: { itemId }, data: { cursor } });

  console.log(`TODO: Implement transaction sync for item ${itemId}`);
}
