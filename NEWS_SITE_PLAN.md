# News Site Implementation Plan

## Overview
Transform AstroPlate from a static blog template into a news site using Static Site Generation (SSG) with a batched JSON backend API.

## Current Architecture
- **Framework**: Astro with React integration
- **Content**: File-based (Markdown/MDX in `/src/content`)
- **Build Mode**: Static generation from local files
- **Data Source**: Astro Collections API

## Target Architecture
- **Content**: Fetched from JSON API at `https://api.newshelp.org`
- **Data Structure**: Batched JSON files (100 items per batch)
- **Build Mode**: Static generation with build-time API fetching
- **URL Structure**: `/news/[id]`, `/tag/[tagId]`, `/source/[source]`

---

## Backend Data Structure

### Available JSON Files
- `meta.json` - Metadata with latest IDs for each table
- `news_sources.json` - News source information
- `tags.json` - Category/tag definitions
- `tag_articles.json` - Tag-to-article mappings
- `news_articles.json` - Base articles file
- `news_articles.{batch}.json` - Batched articles (0, 100, 200, ...)
- `news_raw.{batch}.json` - Raw news items in batches

### Key Data Types
- **Source**: News source metadata (id, title, link, description, origin)
- **Tag**: Category/tag definition (id, tag name, description, parent tags)
- **Meta**: Build metadata with latest IDs for all tables
- **NewsArticle**: Aggregated news clusters (id, title, articles array, categories)
- **NewsRawItem**: Individual news items (id, title, content, source, image, tags)

### Batch Structure
- Batch size: 100 items per file
- Naming: `{entity}.{batch_start_id}.json`
- Example: `news_raw.0.json`, `news_raw.100.json`, `news_raw.200.json`

---

## Implementation Steps

### Phase 1: Core Infrastructure

#### Step 1: Create Type Definitions
**File**: `src/types/news.ts`

Copy type definitions from reference code:
- Source interface
- Meta interface
- Tag interface
- NewsArticle interface
- TagArticles interface
- NewsRawItem interface

These types will be used throughout the application for type safety.

#### Step 2: Create API Client Library
**File**: `src/lib/newsApi.ts`

Create a library of functions to interact with the JSON backend:

**Core Functions:**
- `fetchFile<T>()` - Generic JSON file fetcher
- `fetchMeta()` - Fetch metadata
- `fetchSources()` - Fetch all news sources
- `fetchTags()` - Fetch all tags
- `fetchTagArticles()` - Fetch tag-to-article mappings

**Batch Handling Functions:**
- `getBatchId()` - Calculate batch ID from item ID
- `fetchNewsArticles()` - Fetch articles with batching support
- `fetchNewsArticleById()` - Fetch single article by ID
- `fetchNewsRawBatch()` - Fetch a single batch of raw news
- `fetchNewsRawByIds()` - Fetch multiple raw news items by IDs

**Query Functions:**
- `fetchNewsByTag()` - Get news items for a specific tag
- `searchNews()` - Search across all news items

**Key Considerations:**
- All functions must be async and work at build time
- Handle missing batches gracefully (return empty arrays)
- Support pagination via batch fetching
- Cache results to avoid duplicate requests

#### Step 3: Configure Environment Variables
**File**: `.env`

Define configuration for API access:
- API base URL
- Request timeout settings
- Build limits (how many batches to fetch)

#### Step 4: Update Astro Configuration
**File**: `astro.config.mjs`

Configure for static site generation:
- Set `output: 'static'` (NOT server mode)
- Keep sitemap integration for SEO
- Adjust Vite build settings for parallel file operations

---

### Phase 2: Page Creation

#### Step 5: Create Homepage
**File**: `src/pages/index.astro`

**Build-Time Data Fetching:**
- Fetch meta information
- Fetch latest news articles (limited quantity)
- Fetch tags for navigation
- Fetch raw news items for featured section

**Sections:**
- Hero/featured article (latest or most important)
- Tags/categories navigation bar
- Latest news grid (top 10-20 items)
- Optional: Trending news section

#### Step 6: Create Article Detail Pages
**File**: `src/pages/news/[id].astro`

**Static Path Generation:**
- Use `getStaticPaths()` to generate pages
- Fetch metadata to determine latest news ID
- Loop through batches to collect all article IDs
- Limit to recent N batches for faster builds (configurable)

**Data Fetching:**
- Fetch single news raw item by ID
- Fetch all tags to display article categories
- Optionally fetch related articles

**Page Layout:**
- Article header (title, source, date, tags)
- Featured image (if available)
- Article content
- Link to original source
- Related articles section

#### Step 7: Create Tag/Category Pages
**File**: `src/pages/tag/[tagId].astro`

**Static Path Generation:**
- Fetch all tags from API
- Generate one page per tag

**Data Fetching:**
- Fetch news items for this specific tag
- Fetch tag metadata for display

**Page Layout:**
- Tag header (name, description)
- News grid for this tag
- Pagination (if needed, or limit to N items)

#### Step 8: Create Source Pages (Optional)
**File**: `src/pages/source/[source].astro`

Similar to tag pages but filtered by news source.

---

### Phase 3: Component Creation

#### Step 9: Create NewsCard Component
**File**: `src/components/NewsCard.astro`

Reusable news item card for grids:
- Image (if available)
- Source name
- Article title (truncated)
- Brief description (truncated)
- Publication date
- Hover effects and animations

#### Step 10: Create TagList Component
**File**: `src/components/TagList.astro`

Display list of tags:
- Horizontal scrolling or grid layout
- Links to tag pages
- Optional: limit to top N tags

#### Step 11: Create ArticleContent Component
**File**: `src/components/ArticleContent.astro`

Render article content safely:
- Parse markdown or HTML content
- Sanitize if needed
- Apply typography styles

#### Step 12: Update Navigation Components
**Files**: Layout components in `src/layouts/`

Update navigation to reflect news structure:
- Replace "Blog" with "News"
- Add tags/categories dropdown
- Update menu configuration

---

### Phase 4: Styling and Polish

#### Step 13: Update Layouts
**Files**: `src/layouts/Base.astro`, etc.

- Add news-specific meta tags (OG, Twitter cards)
- Update site title and description
- Add structured data for SEO (Article schema)
- Ensure responsive design

#### Step 14: Create News-Specific Styles
**File**: `src/styles/news.css`

- News grid layouts
- Card styles and hover effects
- Article typography
- Tag badge styles
- Breaking news ticker (if needed)

---

### Phase 5: Build and Deployment

#### Step 15: Optimize Build Performance

**Build Strategy:**
- Limit static paths to recent articles (configurable)
- Use parallel fetching for batches
- Add build progress indicators

**Optional Build Script:**
- Create pre-fetch script to warm up caches
- Log statistics (articles fetched, pages generated)

#### Step 16: Configure Rebuild Strategy

Since content updates frequently, consider:
- Set up automated builds (cron job, webhook)
- Use CI/CD pipeline for deployment
- Incremental builds if supported

---

## File Structure (New Files)

```
astroplate/
├── src/
│   ├── types/
│   │   └── news.ts                 # NEW: Type definitions
│   ├── lib/
│   │   └── newsApi.ts              # NEW: API client
│   ├── pages/
│   │   ├── index.astro             # MODIFY: Homepage
│   │   └── news/
│   │       └── [id].astro          # NEW: Article pages
│   ├── tag/
│   │   └── [tagId].astro           # NEW: Tag pages
│   ├── components/
│   │   ├── NewsCard.astro          # NEW: News card
│   │   ├── TagList.astro           # NEW: Tag list
│   │   └── ArticleContent.astro    # NEW: Article renderer
│   └── layouts/
│       └── Base.astro              # MODIFY: Update navigation
├── reference/
│   ├── types.ts                    # Reference: Existing types
│   ├── api.ts                      # Reference: Existing API
│   └── store.ts                    # Reference: Store logic
├── .env                            # NEW: API config
└── astro.config.mjs                # MODIFY: Build config
```

---

## Key Differences from Reference Implementation

| Aspect | Reference (React) | This Implementation |
|--------|------------------|---------------------|
| Framework | React with Zustand | Astro (SSG) |
| Data Loading | Client-side (async) | Build-time (getStaticPaths) |
| State Management | Zustand store | N/A (static) |
| Routing | React Router | Astro file-based routing |
| Caching | In-memory Maps | Build-time only |

**What to Reuse:**
- Type definitions
- API fetching logic
- Batch calculation logic

**What to Adapt:**
- Remove client-side state management
- Convert async fetching to build-time
- Use Astro's static path generation

---

## Build-Time Data Flow

```
1. Build starts
   ↓
2. Astro discovers pages with getStaticPaths()
   ↓
3. Each page calls API functions:
   - fetchMeta() → get latest IDs
   - fetchTags() → generate tag pages
   - fetchNewsArticles() → generate article pages
   ↓
4. Fetch batches from API:
   - news_raw.0.json
   - news_raw.100.json
   - ... (up to configured limit)
   ↓
5. Generate HTML pages:
   - /index.html
   - /news/123.html
   - /news/124.html
   - /tag/1.html
   - ...
   ↓
6. Write to /dist
   ↓
7. Deploy static files
```

---

## Performance Considerations

### Build Time Optimization
- **Limit article count**: Only generate pages for N most recent articles
- **Parallel fetching**: Fetch multiple batches concurrently
- **Incremental builds**: Only regenerate changed content (future enhancement)

### Runtime Performance (Static Site)
- **No API calls at runtime**: All data is pre-fetched
- **Fast page loads**: Pure static HTML
- **CDN-friendly**: Can be hosted anywhere
- **No server costs**: Pure static hosting

### Trade-offs
- **Pros**: Fast, secure, cheap, scalable
- **Cons**: Build time increases with article count, not real-time

---

## Success Criteria

- [ ] Homepage displays latest news
- [ ] Individual article pages generated for news items
- [ ] Tag pages work and show relevant articles
- [ ] All data fetched from JSON API at build time
- [ ] Static build completes without errors
- [ ] Site deploys as pure static files
- [ ] Navigation reflects news structure
- [ ] Responsive design maintained

---

## Next Steps

1. Review and approve this plan
2. Begin implementation with Phase 1 (Core Infrastructure)
3. Test with limited data first (few batches)
4. Scale up to full dataset
5. Deploy and monitor build performance

---

## Questions to Resolve

1. **How many recent articles** should we generate pages for? (affects build time)
2. **Should we include all historical batches** or limit to recent ones?
3. **Search functionality**: Client-side (index JSON) or build-time (static result pages)?
4. **Build frequency**: How often should we rebuild? (cron, webhook, manual?)
5. **Image handling**: Are images hosted on the same domain or external?
