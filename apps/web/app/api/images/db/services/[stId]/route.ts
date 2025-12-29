import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.ST_AUTOMATION_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { stId: string } }
) {
  const { stId } = params;
  
  try {
    // Fetch image from ST Automation backend
    const res = await fetch(`${ST_AUTOMATION_URL}/images/db/services/${stId}`, {
      headers: { 'Accept': 'image/*' },
    });
    
    if (!res.ok) {
      // Return a placeholder or 404
      return new NextResponse(null, { status: 404 });
    }
    
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await res.arrayBuffer();
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Failed to fetch service image:', error);
    return new NextResponse(null, { status: 404 });
  }
}
