/**
 * Pagination Utilities
 * Helpers for fetching paginated data from ServiceTitan API
 */

/**
 * Fetch all pages from a paginated ServiceTitan API endpoint
 * @param {Function} fetchFn - Function that takes page number and returns {data, hasMore}
 * @param {Object} options - Configuration options
 * @returns {Array} All items from all pages
 */
export async function fetchAllPages(fetchFn, options = {}) {
  const {
    maxPages = 50,
    pageSize = 500,
    onPageFetch = null, // Callback for progress logging
  } = options;
  
  let allItems = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore && page <= maxPages) {
    const result = await fetchFn(page, pageSize);
    
    if (!result.data || !Array.isArray(result.data)) {
      console.error(`[PAGINATION] Invalid response on page ${page}:`, result);
      break;
    }
    
    allItems = allItems.concat(result.data);
    
    if (onPageFetch) {
      onPageFetch({ page, itemsOnPage: result.data.length, totalSoFar: allItems.length });
    }
    
    hasMore = result.hasMore === true || result.data.length === pageSize;
    page++;
  }
  
  if (page > maxPages) {
    console.warn(`[PAGINATION] Reached max pages limit (${maxPages}). Some data may be missing.`);
  }
  
  return allItems;
}

export default fetchAllPages;
