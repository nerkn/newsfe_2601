const API_BASE_URL = 'https://api.newshelp.org';

/**
 * Fetch a single news raw item by ID
 */
export async function fetchNewsRawById(id) {
  const batchId = Math.floor(id / 100) * 100;

  try {
    const response = await fetch(`${API_BASE_URL}/news_raw.${batchId}.json`);
    if (!response.ok) return null;

    const batch = await response.json();
    return batch.find((item) => item.id === id) || null;
  } catch (error) {
    console.error(`Failed to fetch article ${id}:`, error);
    return null;
  }
}

/**
 * Fetch a batch of news items
 */
export async function fetchBatch(batchId) {
  try {
    const response = await fetch(`${API_BASE_URL}/news_raw.${batchId}.json`);
    if (!response.ok) return [];

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch batch ${batchId}:`, error);
    return [];
  }
}

/**
 * Fetch news by tag ID
 */
export async function fetchNewsByTag(tagId, limit = 20) {
  try {
    const response = await fetch(`${API_BASE_URL}/tag_articles.json`);
    if (!response.ok) return [];

    const tagArticles = await response.json();
    const tagMapping = tagArticles.find((t) => t.tag_id === tagId);

    if (!tagMapping) return [];

    const articleIds = tagMapping.articles.slice(0, limit);

    // Fetch all items
    const items = await Promise.all(articleIds.map((id) => fetchNewsRawById(id)));

    return items.filter(Boolean);
  } catch (error) {
    console.error(`Failed to fetch news for tag ${tagId}:`, error);
    return [];
  }
}
