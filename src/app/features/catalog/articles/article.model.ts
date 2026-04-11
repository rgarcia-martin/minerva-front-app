export interface Article {
  id: string;
  name: string;
  code: string;
  barcode: string | null;
  image: string | null;
  description: string | null;
  taxId: string;
  basePrice: number;
  retailPrice: number;
  canHaveChildren: boolean;
  numberOfChildren: number | null;
  childArticleId: string | null;
}

export interface ArticleRequest {
  name: string;
  code: string;
  barcode: string | null;
  image: string | null;
  description: string | null;
  taxId: string;
  basePrice: number;
  retailPrice: number;
  canHaveChildren: boolean;
  numberOfChildren: number | null;
  childArticleId: string | null;
}
