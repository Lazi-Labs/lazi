// app/settings/bank-connections/page.tsx
// Example page showing how to use Plaid integration

'use client';

import { useState } from 'react';
import { PlaidLinkButton, ConnectedAccounts } from '@/components/PlaidLink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function BankConnectionsPage() {
  const { toast } = useToast();
  
  // In real app, get these from your auth context
  const userId = 'user_123';
  const tenantId = 'tenant_456';
  
  // In real app, fetch from your API
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

  const handleSuccess = (itemId: string, accounts: any[]) => {
    toast({
      title: 'Bank Connected!',
      description: `Successfully connected ${accounts.length} account(s)`,
    });
    
    // Refresh connected accounts
    setConnectedAccounts((prev) => [
      ...prev,
      ...accounts.map((a) => ({
        ...a,
        institutionName: 'Your Bank', // This would come from your DB
      })),
    ]);
  };

  const handleError = (error: string) => {
    toast({
      title: 'Connection Failed',
      description: error,
      variant: 'destructive',
    });
  };

  const handleRemove = async (accountId: string) => {
    // Call your API to remove the connection
    // await fetch(`/api/plaid/items/${accountId}`, { method: 'DELETE' });
    setConnectedAccounts((prev) => prev.filter((a) => a.id !== accountId));
    toast({
      title: 'Account Removed',
      description: 'Bank account has been disconnected',
    });
  };

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Bank Connections</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connect Your Bank</CardTitle>
          <CardDescription>
            Securely connect your bank account to automatically import transactions
            and reconcile payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlaidLinkButton
            userId={userId}
            tenantId={tenantId}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectedAccounts
            accounts={connectedAccounts}
            onRemove={handleRemove}
          />
        </CardContent>
      </Card>

      {/* Info section */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">🔒 Your data is secure</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• We use Plaid, a trusted service used by thousands of apps</li>
          <li>• Your bank credentials are never stored on our servers</li>
          <li>• You can disconnect at any time</li>
          <li>• We only access transaction data, never your balance transfers</li>
        </ul>
      </div>
    </div>
  );
}
