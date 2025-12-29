import { NextRequest, NextResponse } from 'next/server';

const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:3001/api/crm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  try {
    // Build query params for CRM API
    const params = new URLSearchParams();
    
    // Map Payload-style params to CRM API params
    const pipelineId = searchParams.get('where[pipeline][equals]');
    const stageId = searchParams.get('where[stage][equals]');
    const status = searchParams.get('status');
    
    if (pipelineId) params.set('pipeline_id', pipelineId);
    if (stageId) params.set('stage_id', stageId);
    if (status) params.set('status', status);
    
    const res = await fetch(`${CRM_API_URL}/opportunities?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch opportunities from CRM API:', res.status);
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
    // Transform to match expected Payload CMS format
    return NextResponse.json({
      docs: data.opportunities || [],
      totalDocs: data.opportunities?.length || 0,
      limit: 100,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${CRM_API_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(error, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data.opportunity || data);
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const res = await fetch(`${CRM_API_URL}/opportunities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(error, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data.opportunity || data);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}
