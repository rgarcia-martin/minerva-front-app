export type ItemStatus = 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'OPENED';

export interface Item {
  id: string;
  articleId: string;
  itemStatus: ItemStatus;
  parentItemId: string | null;
  hasChildren: boolean;
  cost: number;
  buyTaxId: string;
  specialBuyTaxId: string | null;
  providerId: string;
  locationId: string | null;
}
