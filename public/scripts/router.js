import { renderArticle, renderCluster } from './renderer.js';

// Cache for loaded pages
const articleCache = new Map();
const clusterCache = new Map();

/**
 * Initialize client-side router
 */
export function initRouter() {
  // Intercept link clicks
  document.addEventListener('click', handleLinkClick);

  // Handle browser back/forward
  window.addEventListener('popstate', handlePopState);
}

/**
 * Handle link clicks
 */
function handleLinkClick(event) {
  const link = event.target.closest('a');

  if (!link) return;

  const href = link.getAttribute('href');

  // Check if it's a news article link
  const newsMatch = href?.match(/^\/news\/(\d+)$/);

  if (newsMatch) {
    event.preventDefault();

    const id = parseInt(newsMatch[1]);

    // Check if cache has it
    if (articleCache.has(id)) {
      history.pushState({ id, type: 'article' }, '', href);
      return;
    }

    // Try navigation first (for static pages)
    // If 404, render client-side
    navigateToArticle(id, href);
    return;
  }

  // Check if it's a cluster link
  const clusterMatch = href?.match(/^\/cluster\/(\d+)$/);

  if (clusterMatch) {
    event.preventDefault();

    const id = parseInt(clusterMatch[1]);

    // Check if cache has it
    if (clusterCache.has(id)) {
      history.pushState({ id, type: 'cluster' }, '', href);
      return;
    }

    // Try navigation first (for static pages)
    // If 404, render client-side
    navigateToCluster(id, href);
  }
}

/**
 * Navigate to article
 */
async function navigateToArticle(id, url) {
  // Try normal navigation first (for static pages)
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (response.ok) {
      // Static page exists, navigate normally
      window.location.href = url;
      return;
    }
  } catch {
    // Network error, continue to client-side rendering
  }

  // Static page doesn't exist, render client-side
  await renderArticle(id);
  articleCache.set(id, true);
}

/**
 * Navigate to cluster
 */
async function navigateToCluster(id, url) {
  // Try normal navigation first (for static pages)
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (response.ok) {
      // Static page exists, navigate normally
      window.location.href = url;
      return;
    }
  } catch {
    // Network error, continue to client-side rendering
  }

  // Static page doesn't exist, render client-side
  await renderCluster(id);
  clusterCache.set(id, true);
}

/**
 * Handle browser back/forward
 */
function handlePopState(event) {
  const { id, type } = event.state || {};

  if (!id || !type) return;

  if (type === 'article') {
    renderArticle(id);
  } else if (type === 'cluster') {
    renderCluster(id);
  }
}
