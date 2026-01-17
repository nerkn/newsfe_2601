import { createStore } from 'zustand/vanilla';
import type { AppState, NewsRawItem, NewsArticle } from './types';
import { fetchSources, fetchTags, fetchNewsArticles, fetchTagArticles, fetchNewsRawBatch, fetchNewsArticle, getBatchId, fetchFile } from './api';

export const useStore = createStore<AppState>((set, get) => ({
  sources: [],
  tags: [],
  news_articles: [],
  tag_articles: [],
  newsRawCache: new Map(),
  newsArticleCache: new Map(),
  meta: null,
  isLoaded: false,
  isLoading: false,
  error: null,

  fetchCoreData: async () => {
    const state = get();
    if (state.isLoaded || state.isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const meta = await fetchFile<{ generated_at: string; tables: any }>('meta');

      const [sources, tags, tag_articles] = await Promise.all([
        fetchSources(),
        fetchTags(),
        fetchTagArticles(),
      ]);

      set({
        sources,
        tags,
        tag_articles,
        meta,
        isLoaded: true,
        isLoading: false,
      });

      const latestNewsRawId = meta.tables?.news_raw?.latest_id;
      if (latestNewsRawId) {
        const batchSize = 100;
        const latestBatchStart = Math.floor(latestNewsRawId / batchSize) * batchSize;
        const previousBatchStart = latestBatchStart - batchSize;

        const batchPromises: Promise<NewsRawItem[]>[] = [];
        batchPromises.push(fetchNewsRawBatch(latestBatchStart));
        if (previousBatchStart >= 0) {
          batchPromises.push(fetchNewsRawBatch(previousBatchStart));
        }

        const batches = await Promise.all(batchPromises);
        const cache = new Map(state.newsRawCache);
        batches.flat().forEach(item => {
          cache.set(item.id, item);
        });
        set({ newsRawCache: cache });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load data',
        isLoading: false,
      });
    }
  },

  fetchLatestNewsArticles: async (limit: number = 20): Promise<void> => {
    const state = get();
    const latestId = state.meta?.tables?.news_articles?.latest_id;
    
    if (!latestId) return;

    try {
      const articles = await fetchNewsArticles(latestId, limit);
      set({ news_articles: articles });
    } catch (error) {
      console.error('Failed to fetch latest news articles:', error);
    }
  },

  fetchNewsRaw: async (ids: number[]): Promise<NewsRawItem[]> => {
    const state = get();
    const cache = new Map(state.newsRawCache);
    const uncachedIds = ids.filter(id => !cache.has(id));

    if (uncachedIds.length === 0) {
      return ids.map(id => cache.get(id)!).filter(Boolean);
    }

    const batchIds = new Set(uncachedIds.map(getBatchId));

    try {
      const batches = await Promise.all(
        Array.from(batchIds).map(batchId => fetchNewsRawBatch(batchId))
      );

      batches.flat().forEach(item => {
        cache.set(item.id, item);
      });

      set({ newsRawCache: cache });

      return ids.map(id => cache.get(id)!).filter(Boolean);
    } catch (error) {
      console.error('Failed to fetch news_raw:', error);
      return [];
    }
  },

  getNewsRawById: (id: number) => {
    return get().newsRawCache.get(id);
  },

  getNewsByTag: (tagId: number) => {
    const state = get();
    return Array.from(state.newsRawCache.values()).filter(item =>
      item.cats.includes(tagId)
    );
  },

  getNewsByTags: (tagIds: number[], limit: number = 10) => {
    const state = get();
    const newsMap = new Map<number, NewsRawItem>();

    // Collect all news items that match any of the tag IDs
    Array.from(state.newsRawCache.values()).forEach(item => {
      if (tagIds.some(tagId => item.cats.includes(tagId))) {
        newsMap.set(item.id, item);
      }
    });

    // Convert to array and limit results
    return Array.from(newsMap.values()).slice(0, limit);
  },

  fetchNewsArticleById: async (id: number): Promise<NewsArticle | undefined> => {
    const state = get();
    const cached = state.newsArticleCache.get(id);
    if (cached) return cached;

    try {
      const articles = await fetchNewsArticle(id);
      const cache = new Map(state.newsArticleCache);
      articles.forEach(article => {
        cache.set(article.id, article);
      })
      set({ newsArticleCache: cache });
      return cache.get(id);
    } catch (error) {
      console.error(`Failed to fetch news_article ${id}:`, error);
      return undefined;
    }
  },

  fetchMeta: async () => {
    try {
      const meta = await fetchFile<{ generated_at: string; tables: any }>('meta');
      set({ meta });
    } catch (error) {
      console.error('Failed to fetch meta:', error);
    }
  },

  searchNews: async (query: string): Promise<NewsRawItem[]> => {
    const state = get();
    if (!query.trim()) return [];
    
    const meta = state.meta;
    if (!meta) return [];
    
    const latestId = meta.tables.news_raw.latest_id;
    const batchSize = 100;
    const batches = Math.ceil(latestId / batchSize);
    const results: NewsRawItem[] = [];
    
    const searchLower = query.toLowerCase();
    
    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      try {
        const batch = await fetchNewsRawBatch(batchStart);
        const filtered = batch.filter(item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.article.toLowerCase().includes(searchLower)
        );
        results.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch batch ${batchStart}:`, error);
      }
    }
    
    return results;
  },
}));
