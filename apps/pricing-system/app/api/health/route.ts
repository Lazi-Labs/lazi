import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerClient();

    // Test database connection
    const { data, error } = await supabase
      .from("pricing_organizations")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json({
        status: "unhealthy",
        database: "disconnected",
        error: error.message,
      }, { status: 503 });
    }

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 503 });
  }
}
