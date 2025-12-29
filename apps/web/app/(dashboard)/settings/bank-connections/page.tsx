'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { PlaidLinkButton, ConnectedAccounts } from '@/components/plaid/PlaidLink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BuilderSection } from '@/components/builder';
import { PageHeader } from '@/components/shared';
import { Building2, RefreshCw, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface PlaidItem {
  id: string;
  itemId: string;
  institutionName: string;
  status: 'active' | 'error' | 'pending_expiration' | 'revoked';
  errorCode?: string;
  errorMessage?: string;
  consentExpiresAt?: string;
  createdAt: string;
  accounts: PlaidAccount[];
}

interface PlaidAccount {
  id: string;
  accountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask: string;
  currentBalance?: number;
  availableBalance?: number;
  isActive: boolean;
}

const ST_API_URL = process.env.NEXT_PUBLIC_ST_AUTOMATION_URL || '';

export default function BankConnectionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Get tenant ID from env or user context
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';
  const userId = user?.id || 'default_user';

  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check for OAuth redirect state
  const oauthStateId = searchParams.get('oauth_state_id');

  // Fetch connected bank accounts
  const fetchPlaidItems = async () => {
    try {
      const response = await fetch(
        `${ST_API_URL}/api/plaid/items?tenantId=${tenantId}&userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setPlaidItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch Plaid items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlaidItems();
  }, [tenantId, userId]);

  const handleSuccess = (itemId: string, accounts: any[]) => {
    toast({
      title: 'Bank Connected!',
      description: `Successfully connected ${accounts.length} account(s)`,
    });
    // Refresh the list
    fetchPlaidItems();
  };

  const handleError = (error: string) => {
    toast({
      title: 'Connection Failed',
      description: error,
      variant: 'destructive',
    });
  };

  const handleRemove = async (itemId: string) => {
    try {
      const response = await fetch(`${ST_API_URL}/api/plaid/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Account Removed',
          description: 'Bank connection has been removed',
        });
        setPlaidItems(prev => prev.filter(item => item.itemId !== itemId));
      } else {
        throw new Error('Failed to remove');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove bank connection',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlaidItems();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case 'pending_expiration':
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Expiring Soon
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="secondary">
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <BuilderSection>
        <PageHeader
          title="Bank Connections"
          description="Connect your bank accounts to automatically import transactions for payment reconciliation"
        />
      </BuilderSection>

      {/* Connect New Bank Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connect Your Bank
          </CardTitle>
          <CardDescription>
            Securely connect your bank account using Plaid. Your credentials are never stored on our servers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlaidLinkButton
            userId={userId}
            tenantId={tenantId}
            onSuccess={handleSuccess}
            onError={handleError}
            oauthStateId={oauthStateId || undefined}
          />
        </CardContent>
      </Card>

      {/* Connected Accounts Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Manage your connected bank accounts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : plaidItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bank accounts connected yet</p>
              <p className="text-sm">Connect your first bank account above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plaidItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.institutionName || 'Bank Account'}</p>
                        <p className="text-xs text-muted-foreground">
                          Connected {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(item.itemId)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {item.status === 'error' && item.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      {item.errorMessage}
                    </div>
                  )}

                  {item.status === 'pending_expiration' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm text-yellow-700">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Your consent is expiring soon. Please reconnect your bank account.
                    </div>
                  )}

                  <Separator className="my-3" />

                  <div className="space-y-2">
                    {item.accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
                      >
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.type} {account.subtype ? `- ${account.subtype}` : ''} ****{account.mask}
                          </p>
                        </div>
                        {account.currentBalance !== undefined && (
                          <p className="text-sm font-mono">
                            ${account.currentBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Info */}
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Your data is secure
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>We use Plaid, a trusted service used by thousands of apps</li>
          <li>Your bank credentials are never stored on our servers</li>
          <li>You can disconnect at any time</li>
          <li>We only access transaction data for payment reconciliation</li>
        </ul>
      </div>
    </div>
  );
}
