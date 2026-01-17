export interface Source {
  id: number;
  title: string;
  link: string;
  description: string;
  origin: string;
}

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

export interface Tag {
  id: number;
  tag: string;
  desc: string;
  orderBy: number;
  parent: number[];
}

export interface NewsArticle {
  id: number;
  title: string;
  short_desc: string;
  articles: number[];
  created_at: string;
  cats: number[];
}

export interface TagArticles {
  tag_id: number;
  articles: number[];
  description: string;
}

export interface NewsRawItem {
  id: number;
  source: string;
  title: string;
  article: string;
  cats: number[];
  imgUrl: string;
  cluster_id:number;
  created_at : string
  guid : string
  objective :7
}

export interface AppState {
  sources: Source[];
  tags: Tag[];
  news_articles: NewsArticle[];
  tag_articles: TagArticles[];
  newsRawCache: Map<number, NewsRawItem>;
  newsArticleCache: Map<number, NewsArticle>;
  meta: Meta | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  fetchCoreData: () => Promise<void>;
  fetchNewsRaw: (ids: number[]) => Promise<NewsRawItem[]>;
  getNewsRawById: (id: number) => NewsRawItem | undefined;
  getNewsByTag: (tagId: number) => NewsRawItem[];
  getNewsByTags: (tagIds: number[], limit?: number) => NewsRawItem[];
  fetchNewsArticleById: (id: number) => Promise<NewsArticle | undefined>;
  fetchMeta: () => Promise<void>;
  searchNews: (query: string) => Promise<NewsRawItem[]>;
  fetchLatestNewsArticles: (limit?: number) => Promise<void>;
}

export interface Theme {
  name: "light" | "dark";
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
}
