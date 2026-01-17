import { fetchNewsRawById, fetchClusterById, fetchNewsRawByIds } from './client-api.js';

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

    // Update page title
    document.title = `${item.title} - News Site`;

    // Render content
    const main = document.querySelector('main');
    if (!main) return;

    main.innerHTML = `
      <article class="article-full">
        <header class="article-full__header">
          <span class="article-full__source">${item.source}</span>
          <h1 class="article-full__title">${escapeHtml(item.title)}</h1>
          <time class="article-full__date" datetime="${item.created_at}">
            ${formatDate(item.created_at)}
          </time>
        </header>

        ${item.imgUrl ? `
          <div class="article-full__image">
            <img src="${escapeHtml(item.imgUrl)}" alt="${escapeHtml(item.title)}">
          </div>
        ` : ''}

        <div class="article-full__content">
          ${sanitizeHTML(item.article)}
        </div>

        <footer class="article-full__footer">
          <p>Source: <a href="${escapeHtml(item.source)}" target="_blank" rel="noopener">${item.source}</a></p>
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
 * Format date
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

    // Fetch raw items for this cluster
    const rawItems = await fetchNewsRawByIds(cluster.articles);

    // Update page title
    const cleanTitle = cluster.title.replace(/\*\*/g, '');
    document.title = `${cleanTitle} - News Cluster`;

    // Render content
    const main = document.querySelector('main');
    if (!main) return;

    main.innerHTML = `
      <article class="cluster-full">
        <header class="cluster-full__header">
          <h1 class="cluster-full__title">${cleanTitle}</h1>

          ${cluster.short_desc ? `<p class="cluster-full__description">${escapeHtml(cluster.short_desc)}</p>` : ''}

          <time class="cluster-full__date" datetime="${cluster.created_at}">
            ${formatDate(cluster.created_at)}
          </time>

          <div class="cluster-full__meta">
            <span class="cluster-full__count">${rawItems.length} articles in this cluster</span>
          </div>
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
                  <span class="cluster-article-card__source">${item.source}</span>
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
