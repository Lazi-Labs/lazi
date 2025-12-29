// types/plaid.ts

export interface PlaidLinkToken {
  link_token: string;
  expiration: string;
  request_id: string;
}

export interface PlaidAccessToken {
  access_token: string;
  item_id: string;
  request_id: string;
}

export interface PlaidAccount {
  account_id: string;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
    limit: number | null;
  };
  mask: string | null;
  name: string;
  official_name: string | null;
  subtype: string | null;
  type: string;
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  category: string[] | null;
  category_id: string | null;
  date: string;
  datetime: string | null;
  name: string;
  merchant_name: string | null;
  payment_channel: string;
  pending: boolean;
  pending_transaction_id: string | null;
}

export interface PlaidItem {
  id: string;
  userId: string;
  tenantId: string;
  accessToken: string; // encrypted
  itemId: string;
  institutionId: string | null;
  institutionName: string | null;
  cursor: string | null; // for transaction sync
  status: 'active' | 'error' | 'pending_expiration' | 'revoked';
  consentExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaidWebhookPayload {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
  };
  new_transactions?: number;
  removed_transactions?: string[];
}
