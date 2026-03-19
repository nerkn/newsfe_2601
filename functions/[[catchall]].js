/**
 * Cloudflare Pages Function for on-demand SSR of news routes
 * Returns 200 status with full HTML for SEO indexing
 */

const API_BASE_URL = 'https://api.newshelp.org';
const CACHE_TTL = 600; // 10 minutes - aggressive caching as recommended

/**
 * Get batch ID from item ID (batch size = 100)
 */
function getBatchId(id) {
  return Math.floor(id / 100) * 100;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date for display
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
 * Fetch with Cloudflare edge cache
 */
async function fetchWithCache(url, cache) {
  const cached = await cache.match(url);
  if (cached) {
    return cached.json();
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const data = await response.json();
  
  // Cache the response
  cache.put(url, new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  }));

  return data;
}

/**
 * Fetch a raw news item by ID
 */
async function fetchNewsRawById(id, cache) {
  const batchId = getBatchId(id);
  const url = `${API_BASE_URL}/news_raw.${batchId}.json`;
  const batch = await fetchWithCache(url, cache);
  return batch.find(item => item.id === id);
}

/**
 * Fetch a cluster by ID
 */
async function fetchClusterById(id, cache) {
  const batchId = getBatchId(id);
  const url = `${API_BASE_URL}/news_articles.${batchId}.json`;
  
  try {
    const batch = await fetchWithCache(url, cache);
    return batch.find(item => item.id === id);
  } catch {
    // Try base file if batch doesn't exist
    const baseUrl = `${API_BASE_URL}/news_articles.json`;
    const base = await fetchWithCache(baseUrl, cache);
    return base.find(item => item.id === id);
  }
}

/**
 * Generate article HTML response
 */
async function generateArticle(id, cache) {
  const item = await fetchNewsRawById(id, cache);
  
  if (!item) {
    return null;
  }

  // Fetch metadata for SEO
  const [sources, tags] = await Promise.all([
    fetchWithCache(`${API_BASE_URL}/news_sources.json`, cache),
    fetchWithCache(`${API_BASE_URL}/tags.json`, cache)
  ]);

  const source = sources.find(s => s.id === parseInt(item.source));
  const itemTags = tags.filter(tag => item.cats?.includes(tag.id));

  // Prepare data for client hydration
  const clientData = JSON.stringify({
    id: item.id,
    source: item.source,
    title: item.title,
    article: item.article,
    cats: item.cats,
    imgUrl: item.imgUrl,
    created_at: item.created_at
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(item.title)} - News Help</title>
  <meta name="description" content="${escapeHtml(item.article?.substring(0, 160) || '')}">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(item.title)}">
  <meta property="og:description" content="${escapeHtml(item.article?.substring(0, 160) || '')}">
  ${item.imgUrl ? `<meta property="og:image" content="${escapeHtml(item.imgUrl)}">` : ''}
  <meta property="og:url" content="https://newshelp.org/news/${id}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(item.title)}">
  <meta name="twitter:description" content="${escapeHtml(item.article?.substring(0, 160) || '')}">
  ${item.imgUrl ? `<meta name="twitter:image" content="${escapeHtml(item.imgUrl)}">` : ''}
  
  <!-- Canonical -->
  <link rel="canonical" href="https://newshelp.org/news/${id}">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: item.title,
    image: item.imgUrl,
    datePublished: item.created_at,
    description: item.article?.substring(0, 160) || '',
    url: `https://newshelp.org/news/${id}`,
    publisher: {
      '@type': 'Organization',
      name: source?.title || 'News Help'
    }
  })}</script>
  
  <link rel="stylesheet" href="/_astro/index.css">
  <script type="module" src="/scripts/main.js"></script>
</head>
<body>
  <main id="app">
    <article class="article-full">
      <header class="article-full__header">
        <span class="article-full__source">${escapeHtml(source?.title || 'Unknown')}</span>
        <h1 class="article-full__title">${escapeHtml(item.title)}</h1>
        <time class="article-full__date" datetime="${item.created_at}">
          ${formatDate(item.created_at)}
        </time>
        ${itemTags.length > 0 ? `
          <div class="article-full__tags">
            ${itemTags.map(tag => `<span class="tag">${escapeHtml(tag.tag)}</span>`).join('')}
          </div>
        ` : ''}
      </header>
      ${item.imgUrl ? `
        <div class="article-full__image">
          <img src="${escapeHtml(item.imgUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">
        </div>
      ` : ''}
      <div class="article-full__content">
        ${escapeHtml(item.article)}
      </div>
      <footer class="article-full__footer">
        <p>
          Originally published by ${source?.link ? 
            `<a href="${escapeHtml(source.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>` :
            escapeHtml(source?.title || 'Unknown')
          }
        </p>
      </footer>
    </article>
  </main>
  <script>
    // Server-rendered data for client hydration
    window.__DATA__ = ${clientData};
    window.__SERVER_RENDERED__ = true;
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      'X-Robots-Tag': 'index, follow'
    }
  });
}

/**
 * Generate cluster HTML response
 */
async function generateCluster(id, cache) {
  const cluster = await fetchClusterById(id, cache);
  
  if (!cluster) {
    return null;
  }

  // Fetch sources and tags
  const [sources, tags] = await Promise.all([
    fetchWithCache(`${API_BASE_URL}/news_sources.json`, cache),
    fetchWithCache(`${API_BASE_URL}/tags.json`, cache)
  ]);

  // Fetch raw articles (limit to 10 for performance)
  const rawItems = [];
  for (const articleId of cluster.articles.slice(0, 10)) {
    const item = await fetchNewsRawById(articleId, cache);
    if (item) rawItems.push(item);
  }

  const clusterTags = tags.filter(tag => cluster.cats?.includes(tag.id));

  // Prepare data for client hydration
  const clientData = JSON.stringify({
    id: cluster.id,
    title: cluster.title,
    short_desc: cluster.short_desc,
    articles: cluster.articles,
    cats: cluster.cats,
    created_at: cluster.created_at
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cluster.title)} - News Cluster - News Help</title>
  <meta name="description" content="${escapeHtml(cluster.short_desc?.substring(0, 160) || '')}">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(cluster.title)}">
  <meta property="og:description" content="${escapeHtml(cluster.short_desc?.substring(0, 160) || '')}">
  <meta property="og:url" content="https://newshelp.org/articles/${id}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(cluster.title)}">
  <meta name="twitter:description" content="${escapeHtml(cluster.short_desc?.substring(0, 160) || '')}">
  
  <!-- Canonical -->
  <link rel="canonical" href="https://newshelp.org/articles/${id}">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: cluster.title,
    description: cluster.short_desc?.substring(0, 160) || '',
    datePublished: cluster.created_at,
    url: `https://newshelp.org/articles/${id}`,
    publisher: {
      '@type': 'Organization',
      name: 'News Help'
    }
  })}</script>
  
  <link rel="stylesheet" href="/_astro/index.css">
  <script type="module" src="/scripts/main.js"></script>
</head>
<body>
  <main id="app">
    <article class="cluster-full">
      <header class="cluster-full__header">
        <h1 class="cluster-full__title">${escapeHtml(cluster.title)}</h1>
        ${cluster.short_desc ? `<p class="cluster-full__description">${escapeHtml(cluster.short_desc)}</p>` : ''}
        <time class="cluster-full__date" datetime="${cluster.created_at}">
          ${formatDate(cluster.created_at)}
        </time>
        <div class="cluster-full__meta">
          <span class="cluster-full__count">${cluster.articles.length} articles in this cluster</span>
        </div>
        ${clusterTags.length > 0 ? `
          <div class="cluster-full__tags">
            ${clusterTags.map(tag => `<span class="tag">${escapeHtml(tag.tag)}</span>`).join('')}
          </div>
        ` : ''}
      </header>
      <div class="cluster-full__articles">
        <h2 class="cluster-full__section-title">Articles in this Cluster</h2>
        <div class="cluster-full__list">
          ${rawItems.map(item => `
            <a href="/news/${item.id}" class="cluster-article-card">
              ${item.imgUrl ? `
                <div class="cluster-article-card__image">
                  <img src="${escapeHtml(item.imgUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">
                </div>
              ` : ''}
              <div class="cluster-article-card__content">
                <span class="cluster-article-card__source">${escapeHtml(sources.find(s => s.id === parseInt(item.source))?.title || 'Unknown')}</span>
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
  </main>
  <script>
    // Server-rendered data for client hydration
    window.__DATA__ = ${clientData};
    window.__SERVER_RENDERED__ = true;
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      'X-Robots-Tag': 'index, follow'
    }
  });
}

/**
 * Main request handler
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Match /news/{id} or /articles/{id}
  const newsMatch = path.match(/^\/news\/(\d+)$/);
  const articlesMatch = path.match(/^\/articles\/(\d+)$/);

  const cache = caches.default;

  if (newsMatch) {
    const id = parseInt(newsMatch[1]);
    try {
      const response = await generateArticle(id, cache);
      if (response) return response;
    } catch (error) {
      console.error('Failed to generate article:', error);
    }
    // Fall through to 404
  }

  if (articlesMatch) {
    const id = parseInt(articlesMatch[1]);
    try {
      const response = await generateCluster(id, cache);
      if (response) return response;
    } catch (error) {
      console.error('Failed to generate cluster:', error);
    }
    // Fall through to 404
  }

  // Not a news route, fall through to static
  return context.next();
}
