import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  const { newParentId, position, targetId, targetSortOrder, isSubcategory, targetIsSubcategory } = body;

  try {
    console.log('[MOVE] Request for ID:', id, 'Body:', body);

    // Use the isSubcategory flag from frontend (based on depth > 0)
    const itemType = isSubcategory ? 'subcategory' : 'category';
    console.log('[MOVE] Item type:', itemType);

    // Calculate the new position based on drop position relative to target
    // Use targetSortOrder passed from frontend if available
    let newPosition: number;
    const baseSortOrder = targetSortOrder || 0;
    
    if (position === 'before') {
      newPosition = baseSortOrder;
    } else if (position === 'after') {
      newPosition = baseSortOrder + 1;
    } else {
      // 'inside' - becoming a child, position 0 within parent
      newPosition = 0;
    }

    // Choose the correct backend endpoint based on item type
    const endpoint = itemType === 'subcategory'
      ? `${ST_AUTOMATION_URL}/api/pricebook/categories/subcategories/${id}/reorder`
      : `${ST_AUTOMATION_URL}/api/pricebook/categories/${id}/reorder`;

    console.log('[MOVE] Calling endpoint:', endpoint, 'Position:', newPosition);

    // Call backend reorder endpoint with calculated position
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': DEFAULT_TENANT_ID,
      },
      body: JSON.stringify({
        newPosition,
        newParentStId: newParentId ? parseInt(newParentId, 10) : null,
        newParentSubcategoryStId: itemType === 'subcategory' && newParentId ? parseInt(newParentId, 10) : null,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to move item' }));
      console.error('[MOVE] Backend error:', error);
      return NextResponse.json({ success: false, error: error.message || error.error }, { status: res.status });
    }

    const data = await res.json();
    console.log('[MOVE] Success:', data);
    
    return NextResponse.json({
      success: true,
      categoryId: id,
      itemType,
      newParentId,
      position,
      targetId,
      calculatedPosition: newPosition,
      data,
    });
  } catch (error) {
    console.error('[MOVE] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to move item' }, { status: 500 });
  }
}
