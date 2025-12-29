// components/PlaidLink.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { Button } from '@/components/ui/button'; // shadcn button
import { Building2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface PlaidLinkButtonProps {
  userId: string;
  tenantId: string;
  onSuccess?: (itemId: string, accounts: any[]) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
}

export function PlaidLinkButton({
  userId,
  tenantId,
  onSuccess,
  onError,
  className,
  variant = 'default',
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch link token on mount
  useEffect(() => {
    const createLinkToken = async () => {
      try {
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tenantId }),
        });

        if (!response.ok) {
          throw new Error('Failed to create link token');
        }

        const data = await response.json();
        setLinkToken(data.link_token);
      } catch (error) {
        console.error('Error creating link token:', error);
        setErrorMessage('Failed to initialize bank connection');
        setStatus('error');
      }
    };

    createLinkToken();
  }, [userId, tenantId]);

  // Handle successful bank connection
  const handleSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      setLoading(true);
      setStatus('loading');

      try {
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            userId,
            tenantId,
            metadata: {
              institution: metadata.institution,
              accounts: metadata.accounts,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange token');
        }

        const data = await response.json();
        setStatus('success');
        onSuccess?.(data.item_id, data.accounts);
      } catch (error) {
        console.error('Error exchanging token:', error);
        setStatus('error');
        setErrorMessage('Failed to connect bank account');
        onError?.('Failed to connect bank account');
      } finally {
        setLoading(false);
      }
    },
    [userId, tenantId, onSuccess, onError]
  );

  // Plaid Link configuration
  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (error, metadata) => {
      if (error) {
        console.error('Plaid Link error:', error);
        setErrorMessage(error.display_message || 'Connection cancelled');
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = () => {
    if (ready) {
      open();
    }
  };

  // Render based on status
  if (status === 'success') {
    return (
      <Button variant="outline" className={className} disabled>
        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
        Bank Connected
      </Button>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant={variant}
          className={className}
          onClick={handleClick}
          disabled={!ready || loading}
        >
          <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
          Retry Connection
        </Button>
        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={!ready || loading}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Building2 className="w-4 h-4 mr-2" />
          Connect Bank Account
        </>
      )}
    </Button>
  );
}

// ============================================
// Connected Accounts Display Component
// ============================================

interface ConnectedAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  institutionName: string;
}

interface ConnectedAccountsProps {
  accounts: ConnectedAccount[];
  onRemove?: (accountId: string) => void;
}

export function ConnectedAccounts({ accounts, onRemove }: ConnectedAccountsProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No bank accounts connected yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{account.institutionName}</p>
              <p className="text-sm text-muted-foreground">
                {account.name} ••••{account.mask}
              </p>
            </div>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(account.id)}
            >
              Remove
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
