import { renderArticle, renderCluster } from './renderer.js';

const articleCache = new Map();
const clusterCache = new Map();

export function initRouter() {
  handleInitialLoad();

  document.addEventListener('click', handleLinkClick);

  window.addEventListener('popstate', handlePopState);
}

async function handleInitialLoad() {
  const path = window.location.pathname;
  const newsMatch = path.match(/^\/news\/(\d+)$/);
  const articleMatch = path.match(/^\/articles\/(\d+)$/);

  if (newsMatch) {
    const id = parseInt(newsMatch[1]);
    await navigateToArticle(id, path);
  } else if (articleMatch) {
    const id = parseInt(articleMatch[1]);
    await navigateToCluster(id, path);
  }
}

function handleLinkClick(event) {
  const link = event.target.closest('a');

  if (!link) return;

  const href = link.getAttribute('href');

  const newsMatch = href?.match(/^\/news\/(\d+)$/);

  if (newsMatch) {
    event.preventDefault();

    const id = parseInt(newsMatch[1]);

    if (articleCache.has(id)) {
      history.pushState({ id, type: 'article' }, '', href);
      return;
    }

    navigateToArticle(id, href);
    return;
  }

  const articlesMatch = href?.match(/^\/articles\/(\d+)$/);

  if (articlesMatch) {
    event.preventDefault();

    const id = parseInt(articlesMatch[1]);

    if (clusterCache.has(id)) {
      history.pushState({ id, type: 'cluster' }, '', href);
      return;
    }

    navigateToCluster(id, href);
  }
}


async function navigateToArticle(id, url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (response.ok) {
      window.location.href = url;
      return;
    }
  } catch {
  }

  await renderArticle(id);
  articleCache.set(id, true);
}


async function navigateToCluster(id, url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (response.ok) {
      window.location.href = url;
      return;
    }
  } catch {
  }

  await renderCluster(id);
  clusterCache.set(id, true);
}

function handlePopState(event) {
  const { id, type } = event.state || {};

  if (!id || !type) return;

  if (type === 'article') {
    renderArticle(id);
  } else if (type === 'cluster') {
    renderCluster(id);
  }
}
