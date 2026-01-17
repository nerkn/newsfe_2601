import type { Source, Tag, NewsArticle, TagArticles, NewsRawItem } from './types';

const API_BASE_URL = 'https://api.newshelp.org';


export async function fetchFile<T>(file:string): Promise<T> {
  console.log(`Fetching ${file}.json from ${API_BASE_URL}`);
  const response = await fetch(`${API_BASE_URL}/${file}.json`);
  console.log(`Response ${file} status: ${response.status}`);
  if (!response.ok) throw new Error(`Failed to fetch ${file}.json`);
  return response.json();
}

export const fetchSources = async (): Promise<Source[]> => fetchFile<Source[]>('news_sources');

export const fetchTags = async (): Promise<Tag[]> => fetchFile<Tag[]>('tags');

export const fetchNewsArticles = async (latestId?: number, limit: number = 20): Promise<NewsArticle[]> => {
  if (!latestId) {
    return fetchFile<NewsArticle[]>('news_articles');
  }
  
  const batchSize = 100;
  const batches = Math.ceil(latestId / batchSize);
  const promises: Promise<NewsArticle[]>[] = [];
  
  let batchesToFetch = batches;
  if (limit > 0) {
    batchesToFetch = Math.min(batches, Math.ceil(limit / batchSize));
  }
  
  for (let i = 0; i < batchesToFetch; i++) {
    const batchStart = (batches - 1 - i) * batchSize;
    promises.push(
      fetch(`${API_BASE_URL}/news_articles.${batchStart}.json`)
        .then(res => {
          if (!res.ok) return [];
          return res.json() as Promise<NewsArticle[]>;
        })
        .catch(() => [])
    );
  }
  
  const results = await Promise.all(promises);
  const flatResults = results.flat();
  
  if (limit > 0) {
    return flatResults.slice(0, limit);
  }
  
  return flatResults;
};

export const fetchTagArticles = async (): Promise<TagArticles[]> => fetchFile<TagArticles[]>('tag_articles');

export async function fetchNewsRawBatch(startId: number): Promise<NewsRawItem[]> {
  const batchStart = Math.floor(startId / 100) * 100;
  const response = await fetch(`${API_BASE_URL}/news_raw.${batchStart}.json`);
  if (!response.ok) throw new Error(`Failed to fetch news_raw batch ${batchStart}`);
  return response.json();
}

export function getBatchId(newsId: number): number {
  return Math.floor(newsId / 100) * 100;
}

export async function fetchNewsArticle(id: number): Promise<NewsArticle[]> {
  let batchStart = getBatchId(id);
  const response = await fetch(`${API_BASE_URL}/news_articles.${batchStart}.json`);
  if (!response.ok) throw new Error(`Failed to fetch news_article ${id}`);
  return response.json();
}
