import { NextRequest, NextResponse } from 'next/server';

const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:3001/api/crm';

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${CRM_API_URL}/pipelines`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch pipelines from CRM API:', res.status);
      return NextResponse.json({
        docs: [],
        totalDocs: 0,
        limit: 100,
        page: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      });
    }
    
    const data = await res.json();
    // Transform to match expected Payload CMS format for backward compatibility
    return NextResponse.json({
      docs: data.pipelines || [],
      totalDocs: data.pipelines?.length || 0,
      limit: 100,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    return NextResponse.json({
      docs: [],
      totalDocs: 0,
      limit: 100,
      page: 1,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  }
}
