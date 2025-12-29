// lib/plaid.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Products you want to use
export const PLAID_PRODUCTS = ['transactions', 'auth'];

// Countries you support
export const PLAID_COUNTRY_CODES = ['US'];

// Plaid Link customization
export const PLAID_LINK_CONFIG = {
  language: 'en',
  webhook: process.env.PLAID_WEBHOOK_URL,
};
