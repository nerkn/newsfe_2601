import  fs from 'fs';
import path from 'path';

const API_BASE_URL = process.env.NEWS_API_BASE_URL || 'https://api.newshelp.org';
const SITE_URL = process.env.SITE_URL || 'https://newshelp.org';
const STATIC_LIMIT = parseInt(process.env.NEWS_STATIC_ARTICLE_LIMIT || '100');

/**
 * Fetch JSON data from API
 */
async function fetchJSON(file) {
  const response = await fetch(`${API_BASE_URL}/${file}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${file}.json: ${response.status}`);
  }
  return response.json();
}

/**
 * Generate sitemap XML
 */
function generateSitemapXML(urls) {
  const urlset = urls
    .map(
      (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq || 'daily'}</changefreq>
    <priority>${url.priority || 0.7}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;
}

/**
 * Generate sitemap index XML
 */
function generateSitemapIndexXML(sitemaps) {
  const sitemapElements = sitemaps
    .map(
      (sm) => `  <sitemap>
    <loc>${sm.loc}</loc>
    <lastmod>${sm.lastmod}</lastmod>
  </sitemap>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapElements}
</sitemapindex>`;
}

/**
 * Main function
 */
async function generateSitemaps() {
  console.log('🗺️  Generating sitemaps...');

  try {
    // Fetch metadata
    const meta = await fetchJSON('meta');
    const lastmod = meta.generated_at;

    // 1. General sitemap (static pages)
    console.log('  → Generating sitemap.xml...');
    const generalUrls = [
      { loc: SITE_URL + '/', lastmod, changefreq: 'hourly', priority: 1.0 },
      { loc: SITE_URL + '/tags', lastmod, changefreq: 'daily', priority: 0.8 },
    ];

    // Fetch tags
    const tags = await fetchJSON('tags');
    // Simple slugify function (copied from utils)
    const slugifyFn = (text) =>
      text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    generalUrls.push(
      ...tags.map((tag) => ({
        loc: `${SITE_URL}/tag/${slugifyFn(tag.tag)}`,
        lastmod,
        changefreq: 'daily',
        priority: 0.6,
      }))
    );

    const generalSitemap = generateSitemapXML(generalUrls);

    // 2. News articles sitemap (static only)
    console.log('  → Generating sitemap-newsraw.xml...');
    const latestNewsRawId = meta.tables.news_raw.latest_id;
    const newsRawUrls = [];

    // Only fetch the last 2 batches for static pages
    const latestBatch = Math.floor(latestNewsRawId / 100) * 100;
    const batchesToFetch = [latestBatch, latestBatch - 100];

    for (const batchStart of batchesToFetch) {
      if (batchStart < 0) continue;
      try {
        const batch = await fetchJSON(`news_raw.${batchStart}`);
        for (const item of batch) {
          // Only include items within the static range
          if (item.id > latestNewsRawId - STATIC_LIMIT && item.id <= latestNewsRawId) {
            newsRawUrls.push({
              loc: `${SITE_URL}/news/${item.id}`,
              lastmod: item.created_at,
              changefreq: 'monthly',
              priority: 0.5,
            });
          }
        }
      } catch (err) {
        console.warn(`    Batch ${batchStart} not found, skipping...`);
      }
    }

    const newsRawSitemap = generateSitemapXML(newsRawUrls);

    // 3. Article clusters sitemap (static only)
    console.log('  → Generating sitemap-articles.xml...');
    const latestArticlesId = meta.tables.news_articles.latest_id;
    const articleUrls = [];

    // Only fetch the last 2 batches for static pages
    const latestArticleBatch = Math.floor(latestArticlesId / 100) * 100;
    const articleBatchesToFetch = [latestArticleBatch, latestArticleBatch - 100];

    for (const batchStart of articleBatchesToFetch) {
      if (batchStart < 0) continue;
      try {
        const batch = await fetchJSON(`news_articles.${batchStart}`);
        for (const item of batch) {
          // Only include items within the static range
          if (item.id > latestArticlesId - STATIC_LIMIT && item.id <= latestArticlesId) {
            articleUrls.push({
              loc: `${SITE_URL}/articles/${item.id}`,
              lastmod: item.created_at,
              changefreq: 'weekly',
              priority: 0.6,
            });
          }
        }
      } catch (err) {
        console.warn(`    Articles batch ${batchStart} not found, skipping...`);
      }
    }

    const articlesSitemap = generateSitemapXML(articleUrls);

    // 4. Sitemap index
    console.log('  → Generating sitemap-index.xml...');
    const sitemapIndex = generateSitemapIndexXML([
      { loc: SITE_URL + '/sitemap.xml', lastmod },
      { loc: SITE_URL + '/sitemap-newsraw.xml', lastmod },
      { loc: SITE_URL + '/sitemap-articles.xml', lastmod },
    ]);

    // Write files
    const distDir = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), generalSitemap);
    fs.writeFileSync(path.join(distDir, 'sitemap-newsraw.xml'), newsRawSitemap);
    fs.writeFileSync(path.join(distDir, 'sitemap-articles.xml'), articlesSitemap);
    fs.writeFileSync(path.join(distDir, 'sitemap-index.xml'), sitemapIndex);

    console.log('✅ Sitemaps generated successfully!');
    console.log(`   - sitemap.xml (${generalUrls.length} URLs)`);
    console.log(`   - sitemap-newsraw.xml (${newsRawUrls.length} URLs)`);
    console.log(`   - sitemap-articles.xml (${articleUrls.length} URLs)`);
    console.log(`   - sitemap-index.xml`);
  } catch (error) {
    console.error('❌ Error generating sitemaps:', error);
    process.exit(1);
  }
}

generateSitemaps();
