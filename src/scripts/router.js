import { renderArticle } from './renderer.js';

// Cache for loaded articles
const cache = new Map();

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
    if (cache.has(id)) {
      history.pushState({ id }, '', href);
      return;
    }

    // Try navigation first (for static pages)
    // If 404, render client-side
    navigateToArticle(id, href);
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
  cache.set(id, true);
}

/**
 * Handle browser back/forward
 */
function handlePopState(event) {
  const id = event.state?.id;

  if (id) {
    renderArticle(id);
  }
}
