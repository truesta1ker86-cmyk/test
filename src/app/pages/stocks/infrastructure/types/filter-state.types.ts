export type StockQuery = Record<string, string | number | string[]>;

export type StockView = {
  q: string;
  article: string;
  name: string;
  article_operator: string;
  name_operator: string;
  filters: Record<string, string[]>;
  sort: string;
  direction: string;
  page: number;
  page_size: number;
};
