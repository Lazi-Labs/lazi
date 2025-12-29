import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.ST_AUTOMATION_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const imagePath = params.path.join('/');
  
  if (!imagePath) {
    return new NextResponse(null, { status: 400 });
  }
  
  try {
    // Proxy to backend image service
    const res = await fetch(`${ST_AUTOMATION_URL}/images/st/${imagePath}`, {
      headers: { 'Accept': 'image/*' },
    });
    
    if (!res.ok) {
      return new NextResponse(null, { status: 404 });
    }
    
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await res.arrayBuffer();
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Failed to fetch ST image:', error);
    return new NextResponse(null, { status: 404 });
  }
}
