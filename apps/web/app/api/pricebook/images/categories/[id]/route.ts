import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';
const S3_BUCKET_URL = 'https://lazi-pricebook-images.s3.us-east-2.amazonaws.com';

function detectContentType(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // Try backend first
    const res = await fetch(`${ST_AUTOMATION_URL}/images/db/categories/${id}`, {
      headers: { 'Accept': 'image/*' },
    });

    if (res.ok) {
      const imageBuffer = await res.arrayBuffer();
      let contentType = res.headers.get('content-type');
      if (!contentType || contentType === 'application/octet-stream') {
        contentType = detectContentType(imageBuffer);
      }
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Fallback: Try S3 directly with common extensions
    const extensions = ['.jpg', '.png', '.jpeg', '.webp'];
    for (const ext of extensions) {
      const s3Url = `${S3_BUCKET_URL}/${TENANT_ID}/categories/${id}${ext}`;
      try {
        const s3Res = await fetch(s3Url);
        if (s3Res.ok) {
          const imageBuffer = await s3Res.arrayBuffer();
          const contentType = s3Res.headers.get('content-type') || detectContentType(imageBuffer);
          return new NextResponse(imageBuffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  } catch (error) {
    console.error('Category image proxy failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category image' },
      { status: 500 }
    );
  }
}
