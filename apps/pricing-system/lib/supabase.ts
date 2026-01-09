import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses public schema with pricing_ prefixed views)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role (uses public schema with pricing_ prefixed views)
export function createServerClient() {
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Helper to get organization ID from slug
export async function getOrgIdFromSlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("pricing_organizations")
    .select("id")
    .eq("slug", slug)
    .single();
  return (data as { id: string } | null)?.id || null;
}
