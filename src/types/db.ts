// Source: Individual news source
export interface Source {
  id: number;
  title: string;
  link: string;
  description: string;
  origin: string;
}

// Meta: Build metadata
export interface Meta {
  generated_at: string;
  tables: {
    news_articles: { latest_id: number };
    news_raw: { latest_id: number };
    news_sources: { latest_id: number };
    tag_articles: { latest_id: number };
    tags: { latest_id: number };
  };
}

// Tag: Category/tag definition (hierarchical)
export interface Tag {
  id: number;
  tag: string;
  desc: string;
  orderBy: number;
  parent: number[];
}

// NewsArticle: Cluster/aggregated news topic
export interface NewsArticle {
  id: number;
  title: string;
  short_desc: string;
  articles: number[]; // Array of news_raw IDs
  created_at: string;
  cats: number[]; // Tag IDs
}

// TagArticles: Tag-to-article mappings
export interface TagArticles {
  tag_id: number;
  articles: number[];
  description: string;
}

// NewsRawItem: Individual news article from a source
export interface NewsRawItem {
  id: number;
  source: string;
  title: string;
  article: string;
  cats: number[];
  imgUrl: string;
  cluster_id: number;
  created_at: string;
  guid: string;
  objective: 7;
}

// Helper types
export interface NewsWithRaw extends NewsArticle {
  rawItems?: NewsRawItem[];
}

export interface TagWithArticles extends Tag {
  articles?: NewsRawItem[];
}
