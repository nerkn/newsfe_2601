import { fetchNewsRawById, fetchClusterById, fetchNewsRawByIds } from './client-api.js';

// Cache for sources and tags
let sourcesCache = null;
let tagsCache = null;

/**
 * Fetch sources (cached)
 */
async function fetchSources() {
  if (sourcesCache) return sourcesCache;

  try {
    const response = await fetch('https://api.newshelp.org/news_sources.json');
    sourcesCache = await response.json();
    return sourcesCache;
  } catch (error) {
    console.error('Failed to fetch sources:', error);
    return [];
  }
}

/**
 * Fetch tags (cached)
 */
async function fetchTags() {
  if (tagsCache) return tagsCache;

  try {
    const response = await fetch('https://api.newshelp.org/tags.json');
    tagsCache = await response.json();
    return tagsCache;
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return [];
  }
}

/**
 * Format a date string to a readable format
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get source name from sources array
 */
function getSourceName(sourceId, sources) {
  const source = sources.find((s) => s.id === parseInt(sourceId));
  return source?.title || sourceId;
}

/**
 * Get source link from sources array
 */
function getSourceLink(sourceId, sources) {
  const source = sources.find((s) => s.id === parseInt(sourceId));
  return source?.link || '#';
}

/**
 * Generate URL-safe slug from tag name
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Process article content to convert [number] references to links
 */
function processArticleContent(content) {
  return content.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, idsStr) => {
    const ids = idsStr.split(',').map((id) => id.trim());
    const links = ids.map((id) => {
      return `<a href="/news/${id}" class="article-ref">[${id}]</a>`;
    });
    return links.join(' ');
  });
}

/**
 * Remove markdown bold formatting from titles
 */
function cleanTitle(title) {
  return title.replace(/\*\*/g, '');
}

/**
 * Render article page to DOM
 */
export async function renderArticle(id) {
  showLoading();

  try {
    const item = await fetchNewsRawById(id);

    if (!item) {
      renderError('Article not found');
      return;
    }

    // Fetch sources and tags
    const [sources, allTags] = await Promise.all([fetchSources(), fetchTags()]);

    // Get tags for this article
    const itemTags = allTags.filter((tag) => item.cats?.includes(tag.id));

    // Update page title
    document.title = `${item.title} - News Site`;

    // Render content
    const main = document.querySelector('main');
    if (!main) return;

    main.innerHTML = `
      <article class="article-full">
        <header class="article-full__header">
          <span class="article-full__source">${escapeHtml(getSourceName(item.source, sources))}</span>
          <h1 class="article-full__title">${escapeHtml(item.title)}</h1>
          <time class="article-full__date" datetime="${item.created_at}">
            ${formatDate(item.created_at)}
          </time>
          ${itemTags.length > 0 ? `
            <div class="article-full__tags">
              ${itemTags.map((tag) => `
                <a href="/tag/${slugify(tag.tag)}" class="tag">${escapeHtml(tag.tag)}</a>
              `).join('')}
            </div>
          ` : ''}
        </header>

        ${item.imgUrl ? `
          <div class="article-full__image">
            <img src="${escapeHtml(item.imgUrl)}" alt="${escapeHtml(item.title)}">
          </div>
        ` : ''}

        <div class="article-full__content">
          ${processArticleContent(item.article)}
        </div>

        <footer class="article-full__footer">
          <p>
            Originally published by{' '}
            <a href="${escapeHtml(getSourceLink(item.source, sources))}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(getSourceName(item.source, sources))}
            </a>
          </p>
        </footer>
      </article>
    `;

    // Update URL
    history.pushState({ id }, '', `/news/${id}`);
  } catch (error) {
    console.error('Failed to render article:', error);
    renderError('Failed to load article');
  } finally {
    hideLoading();
  }
}

/**
 * Show loading indicator
 */
function showLoading() {
  const main = document.querySelector('main');
  if (!main) return;

  main.innerHTML = `
    <div class="loading" aria-live="polite">
      <div class="loading__spinner"></div>
      <p>Loading...</p>
    </div>
  `;
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  const loading = document.querySelector('.loading');
  if (loading) loading.remove();
}

/**
 * Render error message
 */
function renderError(message) {
  const main = document.querySelector('main');
  if (!main) return;

  main.innerHTML = `
    <div class="error">
      <h1>Error</h1>
      <p>${escapeHtml(message)}</p>
      <a href="/">← Back to homepage</a>
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Basic HTML sanitization
 */
function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html;

  // Remove script tags
  const scripts = div.querySelectorAll('script');
  scripts.forEach((script) => script.remove());

  // Remove event handlers
  const all = div.querySelectorAll('*');
  all.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return div.innerHTML;
}

/**
 * Render cluster page to DOM
 */
export async function renderCluster(id) {
  showLoading();

  try {
    const cluster = await fetchClusterById(id);

    if (!cluster) {
      renderError('Cluster not found');
      return;
    }

    // Fetch raw items, sources, and tags
    const [rawItems, sources, allTags] = await Promise.all([
      fetchNewsRawByIds(cluster.articles),
      fetchSources(),
      fetchTags()
    ]);

    // Get tags for this cluster
    const clusterTags = allTags.filter((tag) => cluster.cats?.includes(tag.id));

    // Process short_desc to convert article references to links
    const processedShortDesc = cluster.short_desc ? processArticleContent(cluster.short_desc) : '';

    // Update page title
    document.title = `${cleanTitle(cluster.title)} - News Cluster`;

    // Render content
    const main = document.querySelector('main');
    if (!main) return;

    main.innerHTML = `
      <article class="cluster-full">
        <header class="cluster-full__header">
          <h1 class="cluster-full__title">${escapeHtml(cleanTitle(cluster.title))}</h1>

          ${processedShortDesc ? `
            <p class="cluster-full__description">${processedShortDesc}</p>
          ` : ''}

          <time class="cluster-full__date" datetime="${cluster.created_at}">
            ${formatDate(cluster.created_at)}
          </time>

          <div class="cluster-full__meta">
            <span class="cluster-full__count">${rawItems.length} articles in this cluster</span>
          </div>

          ${clusterTags.length > 0 ? `
            <div class="cluster-full__tags">
              ${clusterTags.map((tag) => `
                <a href="/tag/${slugify(tag.tag)}" class="tag">${escapeHtml(tag.tag)}</a>
              `).join('')}
            </div>
          ` : ''}
        </header>

        <div class="cluster-full__articles">
          <h2 class="cluster-full__section-title">Articles in this Cluster</h2>
          <div class="cluster-full__list">
            ${rawItems.map((item) => `
              <a href="/news/${item.id}" class="cluster-article-card">
                ${item.imgUrl ? `
                  <div class="cluster-article-card__image">
                    <img src="${escapeHtml(item.imgUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">
                  </div>
                ` : ''}
                <div class="cluster-article-card__content">
                  <span class="cluster-article-card__source">${escapeHtml(getSourceName(item.source, sources))}</span>
                  <h3 class="cluster-article-card__title">${escapeHtml(item.title)}</h3>
                  <time class="cluster-article-card__date" datetime="${item.created_at}">
                    ${formatDate(item.created_at)}
                  </time>
                </div>
              </a>
            `).join('')}
          </div>
        </div>

        <footer class="cluster-full__footer">
          <a href="/">← Back to Home</a>
        </footer>
      </article>
    `;

    // Update URL
    history.pushState({ id, type: 'cluster' }, '', `/cluster/${id}`);
  } catch (error) {
    console.error('Failed to render cluster:', error);
    renderError('Failed to load cluster');
  } finally {
    hideLoading();
  }
}
