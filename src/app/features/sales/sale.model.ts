export type SaleState = 'NEW' | 'CONFIRMED' | 'CANCELLED';

export interface SaleLine {
  id: string;
  itemId: string | null;
  freeConceptId: string | null;
  quantity: number;
  unitPrice: number;
  taxId: string;
}

export interface Sale {
  id: string;
  code: string;
  employeeId: string;
  clientId: string | null;
  paymentMethodId: string;
  state: SaleState;
  createdOn: string;
  lines: SaleLine[];
  totalAmount: number;
}

export interface SaleLineRequest {
  itemId: string | null;
  freeConceptId: string | null;
  quantity: number | null;
  unitPrice: number;
  taxId: string;
}

export interface SaleRequest {
  employeeId: string;
  clientId: string | null;
  paymentMethodId: string;
  lines: SaleLineRequest[];
}
