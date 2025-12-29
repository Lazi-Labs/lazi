# Plaid Integration for LAZI AI

Complete bank connection integration using Plaid for automatic transaction import and payment reconciliation.

## Quick Start

### 1. Install Dependencies

```bash
npm install plaid react-plaid-link
# or
yarn add plaid react-plaid-link
```

### 2. Set Environment Variables

Copy `.env.example` to `.env.local` and fill in your Plaid credentials:

```bash
# From https://dashboard.plaid.com/developers/keys
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_production_secret  # Use sandbox secret for testing

# Environment
PLAID_ENV=sandbox  # sandbox | development | production

# Your app URLs
NEXT_PUBLIC_APP_URL=https://app.lazilabs.com
PLAID_WEBHOOK_URL=https://app.lazilabs.com/api/plaid/webhook

# OAuth redirect (required for some banks)
PLAID_REDIRECT_URI=https://app.lazilabs.com/api/plaid/oauth-redirect
```

### 3. Copy Files to Your Project

```
your-project/
├── lib/
│   └── plaid.ts                 # Plaid client config
├── types/
│   └── plaid.ts                 # TypeScript types
├── app/
│   └── api/
│       └── plaid/
│           ├── create-link-token/
│           │   └── route.ts     # Creates link token
│           ├── exchange-token/
│           │   └── route.ts     # Exchanges public token
│           └── webhook/
│               └── route.ts     # Handles Plaid webhooks
└── components/
    └── PlaidLink.tsx            # React component
```

### 4. Set Up Database Tables

Add these collections to your Payload CMS config:

```typescript
// collections/PlaidItems.ts
export const PlaidItems: CollectionConfig = {
  slug: 'plaid-items',
  fields: [
    { name: 'userId', type: 'text', required: true },
    { name: 'tenantId', type: 'text', required: true },
    { name: 'accessToken', type: 'text', required: true }, // ENCRYPT THIS
    { name: 'itemId', type: 'text', required: true, unique: true },
    { name: 'institutionId', type: 'text' },
    { name: 'institutionName', type: 'text' },
    { name: 'cursor', type: 'text' }, // For transaction sync
    { name: 'status', type: 'select', options: ['active', 'error', 'pending_expiration', 'revoked'] },
    { name: 'consentExpiresAt', type: 'date' },
  ],
};

// collections/PlaidAccounts.ts
export const PlaidAccounts: CollectionConfig = {
  slug: 'plaid-accounts',
  fields: [
    { name: 'plaidItem', type: 'relationship', relationTo: 'plaid-items', required: true },
    { name: 'accountId', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text' },
    { name: 'officialName', type: 'text' },
    { name: 'type', type: 'text' },
    { name: 'subtype', type: 'text' },
    { name: 'mask', type: 'text' },
    { name: 'currentBalance', type: 'number' },
    { name: 'availableBalance', type: 'number' },
  ],
};

// collections/Transactions.ts (for imported bank transactions)
export const Transactions: CollectionConfig = {
  slug: 'transactions',
  fields: [
    { name: 'plaidAccount', type: 'relationship', relationTo: 'plaid-accounts' },
    { name: 'plaidTransactionId', type: 'text', unique: true },
    { name: 'amount', type: 'number', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'name', type: 'text' },
    { name: 'merchantName', type: 'text' },
    { name: 'category', type: 'json' },
    { name: 'pending', type: 'checkbox' },
    { name: 'paymentChannel', type: 'text' },
    // Link to ServiceTitan invoice for reconciliation
    { name: 'matchedInvoice', type: 'relationship', relationTo: 'invoices' },
    { name: 'matchConfidence', type: 'number' },
    { name: 'matchStatus', type: 'select', options: ['unmatched', 'auto_matched', 'manual_matched', 'confirmed'] },
  ],
};
```

### 5. Configure OAuth Redirect (Required for Production)

In your Plaid Dashboard:
1. Go to **Developers** → **API** → **Allowed redirect URIs**
2. Add: `https://app.lazilabs.com/api/plaid/oauth-redirect`

Create the OAuth redirect handler:

```typescript
// app/api/plaid/oauth-redirect/route.ts
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oauth_state_id = searchParams.get('oauth_state_id');
  
  // Redirect back to your app with the OAuth state
  redirect(`/settings/bank-connections?oauth_state_id=${oauth_state_id}`);
}
```

### 6. Set Up Webhook Endpoint

In your Plaid Dashboard:
1. Go to **Developers** → **Webhooks**
2. Add your webhook URL: `https://app.lazilabs.com/api/plaid/webhook`

For local development, use ngrok:
```bash
ngrok http 3000
# Update PLAID_WEBHOOK_URL to your ngrok URL
```

## Usage

```tsx
import { PlaidLinkButton } from '@/components/PlaidLink';

function MyComponent() {
  return (
    <PlaidLinkButton
      userId="user_123"
      tenantId="tenant_456"
      onSuccess={(itemId, accounts) => {
        console.log('Connected!', itemId, accounts);
      }}
      onError={(error) => {
        console.error('Failed:', error);
      }}
    />
  );
}
```

## Testing

Use Plaid's sandbox credentials:
- **Username:** `user_good`
- **Password:** `pass_good`

For different scenarios:
- `user_good` - Successful connection
- `user_transactions_dynamic` - Generates new transactions over time
- See [Plaid Sandbox docs](https://plaid.com/docs/sandbox/) for more test users

## Security Notes

⚠️ **Critical: Encrypt Access Tokens**

Access tokens give full access to the user's bank data. ALWAYS encrypt them before storing:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER CONNECTS BANK                           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────┐    POST /api/plaid/create-link-token    ┌─────────────┐
│   Frontend  │ ─────────────────────────────────────► │   Backend   │
│  (Next.js)  │ ◄───────────────────────────────────── │  (Payload)  │
└─────────────┘         { link_token }                  └─────────────┘
       │                                                       │
       ▼                                                       ▼
┌─────────────┐                                         ┌─────────────┐
│  Plaid Link │ ◄─────────────────────────────────────► │  Plaid API  │
│   (Modal)   │         User authenticates              │             │
└─────────────┘                                         └─────────────┘
       │
       │ onSuccess(public_token)
       ▼
┌─────────────┐    POST /api/plaid/exchange-token       ┌─────────────┐
│   Frontend  │ ─────────────────────────────────────► │   Backend   │
└─────────────┘                                         └─────────────┘
                                                               │
                                                               ▼
                                                        ┌─────────────┐
                                                        │  Store      │
                                                        │  access_    │
                                                        │  token      │
                                                        └─────────────┘
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ONGOING TRANSACTION SYNC                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
       Plaid sends webhook         │
       when new transactions       ▼
       available            ┌─────────────┐
                            │  Webhook    │
                            │  Handler    │
                            └─────────────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │  Sync       │
                            │  Worker     │  ◄── BullMQ job
                            └─────────────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │  Match to   │
                            │  Invoices   │
                            └─────────────┘
```

## Next Steps

1. **Transaction Matching** - Build logic to match bank transactions to ServiceTitan invoices
2. **Reconciliation UI** - Create a UI for reviewing and confirming matches
3. **Alerts** - Notify users of unmatched transactions or discrepancies
4. **Reports** - Cash flow reports based on bank data

## Resources

- [Plaid Docs](https://plaid.com/docs/)
- [Plaid Quickstart](https://plaid.com/docs/quickstart/)
- [react-plaid-link](https://github.com/plaid/react-plaid-link)
- [Plaid Sandbox](https://plaid.com/docs/sandbox/)
