/**
 * Value object: a reference from a parent article to one of its children,
 * with the quantity the parent contains.
 * WHY separate type: mirrors the backend aggregate shape (`ArticleChild`) and
 * lets the form bind a FormArray of well-typed rows instead of parallel arrays.
 */
export interface ArticleChild {
  childArticleId: string;
  quantity: number;
}

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
  /** Derived server-side: true when `children` is non-empty. */
  canHaveChildren: boolean;
  children: ArticleChild[];
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
  children: ArticleChild[];
}
