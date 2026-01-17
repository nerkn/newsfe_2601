import type { Source } from '@/types/db';

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get source name from a sources map
 */
export function getSourceName(sourceId: string | number, sourcesMap: Map<number, Source>): string {
  const id = typeof sourceId === 'string' ? parseInt(sourceId) : sourceId;
  const source = sourcesMap.get(id);
  return source?.title || String(sourceId);
}

/**
 * Get source link from a sources map
 */
export function getSourceLink(sourceId: string | number, sourcesMap: Map<number, Source>): string {
  const id = typeof sourceId === 'string' ? parseInt(sourceId) : sourceId;
  const source = sourcesMap.get(id);
  return source?.link || '#';
}

/**
 * Process article content to convert [number] references to links
 * Handles [3333], [3333,3334], and [3333, 3334, 3335] formats
 */
export function processArticleContent(content: string): string {
  // Replace patterns like [3333] or [3333, 3334, 3335] with links
  return content.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, idsStr) => {
    const ids = idsStr.split(',').map((id: string) => id.trim());
    const links = ids.map((id: string) => {
      return `<a href="/news/${id}" class="article-ref">[${id}]</a>`;
    });
    return links.join(' ');
  });
}

/**
 * Remove markdown bold formatting from titles
 */
export function cleanTitle(title: string): string {
  return title.replace(/\*\*/g, '');
}

/**
 * Generate URL-safe slug from tag name
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
