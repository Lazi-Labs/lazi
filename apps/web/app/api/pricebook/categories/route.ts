import { NextRequest, NextResponse } from 'next/server';

const ST_AUTOMATION_URL = process.env.NEXT_INTERNAL_API_URL || process.env.ST_AUTOMATION_URL || 'http://lazi-api:3001';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';
const BASE_PATH = '/dashboard';

// Simple in-memory cache to prevent rate limiting
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Transform a single category (without children - those are added separately)
function transformCategory(cat: any): any {
  // Use database image endpoint if image_url exists
  const stId = cat.st_id || cat.id;
  // Backend serves images at /images/db/... (proxied through Next.js API)
  const imageUrl = cat.image_url
    ? `${BASE_PATH}/api/pricebook/images/categories/${stId}`
    : null;
    
  return {
    id: String(stId),
    stId: String(stId),
    name: cat.display_name || cat.name || cat.displayName || 'Unnamed',
    parentId: cat.parent_st_id ? String(cat.parent_st_id) : null,
    subcategoryCount: cat.subcategory_count || 0,
    imageUrl,
    businessUnitIds: cat.business_unit_ids || cat.businessUnitIds || [],
    categoryType: cat.category_type || cat.categoryType || null,
    active: cat.is_active ?? cat.active ?? true,
    visible: cat.is_visible_crm ?? true,
    depth: cat.depth || 0,
    sortOrder: cat.sort_order ?? cat.global_sort_order ?? 0,
    children: [],
  };
}

// Recursively transform subcategory and its children
function transformSubcategory(sub: any): any {
  const children = sub.children || [];
  const stId = sub.st_id || sub.id;
  return {
    id: String(stId),
    stId: String(stId),
    name: sub.display_name || sub.name || 'Unnamed',
    parentId: sub.parent_st_id ? String(sub.parent_st_id) : null,
    parentSubcategoryId: sub.parent_subcategory_st_id ? String(sub.parent_subcategory_st_id) : null,
    subcategoryCount: children.length,
    imageUrl: sub.image_url
      ? `${BASE_PATH}/api/pricebook/images/subcategories/${stId}`
      : null,
    businessUnitIds: [],
    categoryType: null,
    active: sub.is_active ?? true,
    visible: sub.is_visible_crm ?? true,
    depth: sub.depth || 1,
    sortOrder: sub.sort_order || 0,
    children: children.map(transformSubcategory),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const flat = searchParams.get('flat') === 'true';
  const active = searchParams.get('active');
  const visible = searchParams.get('visible');

  // Create cache key from params
  const cacheKey = `categories:${type}:${flat}:${active}:${visible}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // Build query params for backend API
    const backendParams = new URLSearchParams();
    backendParams.set('limit', '500');

    // Map type parameter: 'service' -> 'Services', 'material' -> 'Materials'
    if (type && type !== 'all') {
      const mappedType = type === 'service' ? 'Services' : type === 'material' ? 'Materials' : type;
      backendParams.set('type', mappedType);
    }

    if (active !== null) {
      backendParams.set('active', active);
    }

    if (visible !== null) {
      backendParams.set('visible', visible);
    }

    // Fetch list of categories
    const listRes = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/categories?${backendParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': DEFAULT_TENANT_ID,
      },
      cache: 'no-store',
    });

    if (!listRes.ok) {
      console.error('Failed to fetch categories from ST Automation:', listRes.status);
      return NextResponse.json([], { status: 200 });
    }

    const listData = await listRes.json();
    const categories = listData.data || listData || [];

    // Fetch subcategories in batches to avoid rate limiting
    const BATCH_SIZE = 5;
    const categoriesWithSubs: any[] = [];

    for (let i = 0; i < categories.length; i += BATCH_SIZE) {
      const batch = categories.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (cat: any) => {
          // Check individual category cache
          const catCacheKey = `category:${cat.st_id}`;
          const cachedCat = getCached(catCacheKey);
          if (cachedCat) {
            return { ...cat, subcategories: cachedCat };
          }

          try {
            const detailRes = await fetch(`${ST_AUTOMATION_URL}/api/pricebook/categories/${cat.st_id}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': DEFAULT_TENANT_ID,
              },
              cache: 'no-store',
            });

            if (detailRes.ok) {
              const detailData = await detailRes.json();
              const detail = detailData.data || detailData;
              const subcategories = detail.subcategories || [];
              setCache(catCacheKey, subcategories);
              return {
                ...cat,
                subcategories,
              };
            }
          } catch (e) {
            // Ignore errors for individual categories
          }
          return cat;
        })
      );
      categoriesWithSubs.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < categories.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Transform categories and nest subcategories as children
    const transformed = categoriesWithSubs.map((cat: any) => {
      const transformed = transformCategory(cat);
      if (cat.subcategories && cat.subcategories.length > 0) {
        transformed.children = cat.subcategories.map(transformSubcategory);
        transformed.subcategoryCount = transformed.children.length;
      }
      return transformed;
    });

    let result;
    if (flat) {
      // Flatten the tree for dropdown use
      const flattenCategories = (cats: any[], arr: any[] = []): any[] => {
        for (const cat of cats) {
          arr.push({ ...cat, children: undefined });
          if (cat.children?.length) {
            flattenCategories(cat.children, arr);
          }
        }
        return arr;
      };
      result = flattenCategories(transformed);
    } else {
      result = transformed;
    }

    // Cache the result
    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For now, return mock response - would integrate with ST Automation
    const category = {
      id: crypto.randomUUID(),
      ...body,
      children: [],
      itemCount: 0,
    };
    
    return NextResponse.json(category);
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
