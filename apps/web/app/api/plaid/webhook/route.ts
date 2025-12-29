// api/plaid/webhook/route.ts
// Handles all Plaid webhooks for transaction sync and item status updates

import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { decrypt } from '@/lib/encryption';
import { PlaidWebhookPayload } from '@/types/plaid';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';

export async function POST(request: NextRequest) {
  try {
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
  const { webhook_code, item_id } = payload;

  switch (webhook_code) {
    case 'SYNC_UPDATES_AVAILABLE':
      // New transactions available - trigger sync
      console.log(`New transactions available for item ${item_id}`);
      await syncTransactions(item_id);
      break;

    case 'INITIAL_UPDATE':
      // Initial transaction pull complete (last 30 days)
      console.log(`Initial transactions ready for item ${item_id}`);
      await syncTransactions(item_id);
      break;

    case 'HISTORICAL_UPDATE':
      // Historical transactions ready (up to 24 months)
      console.log(`Historical transactions ready for item ${item_id}`);
      await syncTransactions(item_id);
      break;

    case 'TRANSACTIONS_REMOVED':
      // Some transactions were removed/modified
      console.log(`Transactions removed for item ${item_id}`);
      await syncTransactions(item_id);
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
      await updateItemStatus(item_id, 'error', error?.error_code, error?.error_message);
      break;

    case 'PENDING_EXPIRATION':
      // User's consent is expiring soon (7 days)
      console.log(`Item ${item_id} consent expiring soon`);
      await updateItemStatus(item_id, 'pending_expiration');
      break;

    case 'USER_PERMISSION_REVOKED':
      // User revoked access
      console.log(`User revoked access for item ${item_id}`);
      await updateItemStatus(item_id, 'revoked');
      break;

    default:
      console.log('Unhandled item webhook code:', webhook_code);
  }
}

async function handleAuthWebhook(payload: PlaidWebhookPayload) {
  const { webhook_code, item_id } = payload;

  switch (webhook_code) {
    case 'AUTOMATICALLY_VERIFIED':
      console.log(`Auth automatically verified for item ${item_id}`);
      break;

    case 'VERIFICATION_EXPIRED':
      console.log(`Auth verification expired for item ${item_id}`);
      break;

    default:
      console.log('Unhandled auth webhook code:', webhook_code);
  }
}

async function syncTransactions(itemId: string) {
  try {
    // 1. Get the Plaid item from database
    const itemResponse = await fetch(`${ST_AUTOMATION_URL}/plaid/items/${itemId}`);

    if (!itemResponse.ok) {
      console.error(`Plaid item ${itemId} not found in database`);
      return;
    }

    const { item } = await itemResponse.json();

    if (!item.accessToken) {
      console.error(`No access token for item ${itemId}`);
      return;
    }

    // 2. Decrypt the access token
    const accessToken = decrypt(item.accessToken);
    let cursor = item.cursor || undefined;
    let hasMore = true;
    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;

    // 3. Sync all available transactions
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor,
      });

      const { added, modified, removed, next_cursor, has_more } = response.data;

      // 4. Store transactions in database
      if (added.length > 0 || modified.length > 0 || removed.length > 0) {
        const syncResponse = await fetch(`${ST_AUTOMATION_URL}/plaid/transactions/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            added: added.map(txn => ({
              transaction_id: txn.transaction_id,
              account_id: txn.account_id,
              amount: txn.amount,
              date: txn.date,
              datetime: txn.datetime,
              name: txn.name,
              merchant_name: txn.merchant_name,
              category: txn.category,
              category_id: txn.category_id,
              payment_channel: txn.payment_channel,
              pending: txn.pending,
              pending_transaction_id: txn.pending_transaction_id,
            })),
            modified: modified.map(txn => ({
              transaction_id: txn.transaction_id,
              account_id: txn.account_id,
              amount: txn.amount,
              date: txn.date,
              datetime: txn.datetime,
              name: txn.name,
              merchant_name: txn.merchant_name,
              category: txn.category,
              payment_channel: txn.payment_channel,
              pending: txn.pending,
            })),
            removed: removed.map(r => r.transaction_id),
            cursor: next_cursor,
          }),
        });

        if (!syncResponse.ok) {
          console.error('Failed to store transactions:', await syncResponse.text());
        }
      }

      totalAdded += added.length;
      totalModified += modified.length;
      totalRemoved += removed.length;
      cursor = next_cursor;
      hasMore = has_more;
    }

    console.log(`Transaction sync complete for item ${itemId}:`, {
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
    });
  } catch (error) {
    console.error(`Transaction sync failed for item ${itemId}:`, error);
  }
}

async function updateItemStatus(
  itemId: string,
  status: string,
  errorCode?: string,
  errorMessage?: string
) {
  try {
    const response = await fetch(`${ST_AUTOMATION_URL}/plaid/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        errorCode,
        errorMessage,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to update item ${itemId} status:`, await response.text());
    }
  } catch (error) {
    console.error(`Failed to update item ${itemId} status:`, error);
  }
}
