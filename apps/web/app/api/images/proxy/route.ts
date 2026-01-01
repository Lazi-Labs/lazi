import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_INTERNAL_API_URL || 'http://lazi-api:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Proxy to backend image service
    const response = await fetch(
      `${API_URL}/images/proxy?url=${encodeURIComponent(url)}`,
      {
        headers: {
          'Accept': 'image/*',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch image', status: response.status },
        { status: response.status }
      );
    }

    // Get the image data and content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    // Proxy to backend image service
    const response = await fetch(
      `${API_URL}/images/proxy?url=${encodeURIComponent(url)}`,
      {
        method: 'HEAD',
        headers: {
          'Accept': 'image/*',
        },
      }
    );

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Image proxy HEAD error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
