// api/plaid/oauth-redirect/route.ts
// Handles OAuth redirect from banks (Chase, Wells Fargo, etc.)
// This endpoint receives the OAuth state and redirects back to the bank connections page

import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oauth_state_id = searchParams.get('oauth_state_id');

  // Redirect back to the bank connections page with the OAuth state
  // The PlaidLink component will detect this and resume the OAuth flow
  if (oauth_state_id) {
    redirect(`/settings/bank-connections?oauth_state_id=${oauth_state_id}`);
  }

  // If no oauth_state_id, just redirect to the settings page
  redirect('/settings/bank-connections');
}
