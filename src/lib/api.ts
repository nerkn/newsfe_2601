import type { Source, Meta, Tag, NewsArticle, TagArticles, NewsRawItem } from '@/types/db';

const API_BASE_URL = import.meta.env.NEWS_API_BASE_URL || 'https://api.newshelp.org';
const API_TIMEOUT = parseInt(import.meta.env.NEWS_API_TIMEOUT || '30000');

// Memory cache
const fileCache = new Map<string, any>();
const newsArticlesCache = new Map<string, NewsArticle[]>();
const newsRawBatchCache = new Map<number, NewsRawItem[]>();
const newsArticleCache = new Map<number, NewsArticle[]>();

/**
 * Generic JSON file fetcher with timeout and caching
 */
export async function fetchFile<T>(file: string): Promise<T> {
  // Check cache
  if (fileCache.has(file)) {
    console.log(`[API Cache] Hit for ${file}.json`);
    return fileCache.get(file) as T;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    console.log(`[API] Fetching ${file}.json from ${API_BASE_URL}`);
    const response = await fetch(`${API_BASE_URL}/${file}.json`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${file}.json: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[API] Successfully fetched ${file}.json`);

    // Cache the result
    fileCache.set(file, data);

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generic JSON file fetcher WITHOUT caching (for batched operations)
 */
export async function fetchFileUncached<T>(file: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/${file}.json`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${file}.json: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch metadata
 */
export async function fetchMeta(): Promise<Meta> {
  return fetchFile<Meta>('meta');
}

/**
 * Fetch all news sources
 */
export async function fetchSources(): Promise<Source[]> {
  return fetchFile<Source[]>('news_sources');
}

/**
 * Fetch all tags
 */
export async function fetchTags(): Promise<Tag[]> {
  return fetchFile<Tag[]>('tags');
}

/**
 * Fetch tag-to-article mappings
 */
export async function fetchTagArticles(): Promise<TagArticles[]> {
  return fetchFile<TagArticles[]>('tag_articles');
}

/**
 * Calculate batch ID from item ID
 * Batch size is 100 items per file
 */
export function getBatchId(newsId: number): number {
  return Math.floor(newsId / 100) * 100;
}

/**
 * Fetch news articles with batching support
 */
export async function fetchNewsArticles(latestId?: number): Promise<NewsArticle[]> {

  const batchStart =  getBatchId(latestId || 100);
  const cacheKey = `${batchStart || 'base'}`;
  console.log(`GEtting ${cacheKey} news articles` )
  // Check cache
  if (newsArticlesCache.has(cacheKey)) {
    console.log(`[API Cache] Hit for news_articles: ${cacheKey}`);
    return newsArticlesCache.get(cacheKey)!;
  }

  // If no latestId provided, fetch base file
  if (!latestId) {
    const result = await fetchFile<NewsArticle[]>('news_articles');
    newsArticlesCache.set(cacheKey, result);
    return result;
  }

  const flatResults = await fetchFileUncached<NewsArticle[]>(`news_articles.${batchStart}`)
        .catch((err) => {
          console.warn(`[API] Failed to fetch batch ${batchStart}:`, err);
          return [];
        })

  console.log(`Getting ${flatResults.length} flats
     ${flatResults[0].id}  ${flatResults[flatResults.length-1].id}`)

  newsArticlesCache.set(cacheKey, flatResults);
  return flatResults;
}

/**
 * Fetch a single news article by ID
 */
export async function fetchNewsArticleById(id: number): Promise<NewsArticle | undefined> {
  
  const batchStart = getBatchId(id);

  if (newsArticleCache.has(batchStart)) {
    console.log(`[API Cache] Hit for article ${id}`);
    return newsArticleCache.get(batchStart)?.find(a=>a.id===id);
  }


  try {
    const articles = await fetchFileUncached<NewsArticle[]>(`news_articles.${batchStart}`);
    const article = articles.find((a) => a.id === id);

    if (article) {
      newsArticleCache.set(id, articles);
    }

    return article;
  } catch (error) {
    console.warn(`[API] Failed to fetch article ${id}:`, error);
    return undefined;
  }
}

/**
 * Fetch a single batch of raw news items
 */
export async function fetchNewsRawBatch(startId: number): Promise<NewsRawItem[]> {
  const batchStart = getBatchId(startId);

  // Check cache
  if (newsRawBatchCache.has(batchStart)) {
    console.log(`[API Cache] Hit for news_raw batch ${batchStart}`);
    return newsRawBatchCache.get(batchStart)!;
  }

  try {
    const result = await fetchFileUncached<NewsRawItem[]>(`news_raw.${batchStart}`);
    newsRawBatchCache.set(batchStart, result);
    return result;
  } catch (error) {
    console.warn(`[API] Failed to fetch news_raw batch ${batchStart}:`, error);
    return [];
  }
}

/**
 * Fetch multiple raw news items by IDs
 */
export async function fetchNewsRawByIds(ids: number[]): Promise<NewsRawItem[]> {
  if (ids.length === 0) return [];

  // Group by batch
  const batchGroups = new Map<number, number[]>();
  for (const id of ids) {
    const batchId = getBatchId(id);
    if (!batchGroups.has(batchId)) {
      batchGroups.set(batchId, []);
    }
    batchGroups.get(batchId)!.push(id);
  }

  // Fetch each batch
  const results: NewsRawItem[] = [];
  for (const [batchId, idsInBatch] of batchGroups) {
    const batch = await fetchNewsRawBatch(batchId);
    const items = batch.filter((item) => idsInBatch.includes(item.id));
    results.push(...items);
  }

  // Sort by original ID order
  const idOrder = new Map(ids.map((id, index) => [id, index]));
  return results.sort((a, b) => (idOrder.get(a.id) || 0) - (idOrder.get(b.id) || 0));
}

/**
 * Fetch a single raw news item by ID
 */
export async function fetchNewsRawById(id: number): Promise<NewsRawItem | undefined> {
  const batch = await fetchNewsRawBatch(id);
  return batch.find((item) => item.id === id);
}

/**
 * Fetch news items for a specific tag
 */
export async function fetchNewsByTag(tagId: number, limit: number = 20): Promise<NewsRawItem[]> {
  const tagArticles = await fetchTagArticles();
  const tagMapping = tagArticles.find((t) => t.tag_id === tagId);

  if (!tagMapping || tagMapping.articles.length === 0) {
    return [];
  }

  const articleIds = tagMapping.articles.slice(0, limit);
  return fetchNewsRawByIds(articleIds);
}

/**
 * Search news items (build-time only)
 * Note: This is expensive, use sparingly
 */
export async function searchNews(query: string, limit: number = 50): Promise<NewsRawItem[]> {
  // For build-time search, fetch recent batches and filter
  const staticLimit = parseInt(import.meta.env.NEWS_STATIC_ARTICLE_LIMIT || '100');
  const numBatches = Math.ceil(staticLimit / 100);

  const promises: Promise<NewsRawItem[]>[] = [];
  for (let i = 0; i < numBatches; i++) {
    promises.push(fetchNewsRawBatch(i * 100));
  }

  const allBatches = await Promise.all(promises);
  const allItems = allBatches.flat();

  const queryLower = query.toLowerCase();
  const results = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(queryLower) || item.article.toLowerCase().includes(queryLower)
  );

  return results.slice(0, limit);
}

/**
 * Get recent news items
 */
export async function fetchRecentNews(limit: number = 20): Promise<NewsRawItem[]> {
  // Fetch metadata to get latest news_raw ID
  const meta = await fetchMeta();
  const latestId = meta.tables.news_raw.latest_id;

  // Fetch recent batches to get raw items
  const batchSize = 100;
  const numBatches = Math.ceil(limit / batchSize);

  const allRawIds: number[] = [];
  for (let i = 0; i < numBatches; i++) {
    const startId = latestId - i * batchSize;
    allRawIds.push(startId);
  }

  // Fetch items from these batches
  const results: NewsRawItem[] = [];
  for (const startId of allRawIds) {
    const batch = await fetchNewsRawBatch(startId);
    results.push(...batch);
  }

  // Sort by ID descending (newest first) and limit
  const sorted = results.sort((a, b) => b.id - a.id);
  return sorted.slice(0, limit);
}
