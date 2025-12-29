import { NextRequest, NextResponse } from 'next/server';

const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:3001/api/crm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  try {
    // Get pipeline ID from query params
    const pipelineId = searchParams.get('where[pipeline][equals]');
    
    // Fetch all pipelines and extract stages for the requested pipeline
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
    const pipelines = data.pipelines || [];
    
    // Find the requested pipeline and get its stages
    let stages: any[] = [];
    if (pipelineId) {
      const pipeline = pipelines.find((p: any) => p.id === pipelineId);
      stages = pipeline?.stages || [];
    } else {
      // Return all stages from all pipelines
      stages = pipelines.flatMap((p: any) => p.stages || []);
    }
    
    // Sort by display_order
    stages.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
    
    return NextResponse.json({
      docs: stages,
      totalDocs: stages.length,
      limit: 100,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  } catch (error) {
    console.error('Error fetching pipeline stages:', error);
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
