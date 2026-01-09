import { NextResponse } from "next/server";
import { createServerClient } from "./supabase";

// Standard API response helpers
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}

// Get organization ID from slug (defaults to env var)
export async function getOrgId(slug?: string): Promise<string | null> {
  const orgSlug = slug || process.env.NEXT_PUBLIC_ORG_SLUG || "perfect-catch";
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("pricing_organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (error || !data) {
    console.error("Failed to get org ID:", error);
    return null;
  }

  return (data as { id: string }).id;
}

// Parse request body safely
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Validate UUID format
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
