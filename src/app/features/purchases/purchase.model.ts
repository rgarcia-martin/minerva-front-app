export type PurchaseState =
  | 'NEW'
  | 'RECEIVED'
  | 'OUTDATED'
  | 'PAID'
  | 'FINISHED';

export type LineItemStatus = 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'OPENED';

export interface PurchaseLineResponse {
  id: string;
  articleId: string;
  itemId: string | null;
  quantity: number;
  buyPrice: number;
  profitMargin: number;
  taxId: string;
  itemStatus: LineItemStatus;
  hasChildren: boolean;
}

export interface Purchase {
  id: string;
  createdOn: string | null;
  finishDate: string | null;
  state: PurchaseState;
  code: string;
  providerCode: string;
  providerId: string;
  locationId: string;
  deposit: boolean;
  lines: PurchaseLineResponse[];
  totalCost: number;
}

export interface PurchaseLineRequest {
  articleId: string;
  quantity: number;
  buyPrice: number;
  profitMargin: number;
  taxId: string;
  itemStatus?: LineItemStatus;
  hasChildren?: boolean;
}

export interface PurchaseRequest {
  createdOn: string | null;
  finishDate: string | null;
  state: PurchaseState | null;
  code: string;
  providerCode: string;
  providerId: string;
  locationId: string;
  deposit: boolean;
  lines: PurchaseLineRequest[];
}
