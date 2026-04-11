export interface FreeConcept {
  id: string;
  name: string;
  barcode: string;
  price: number;
  taxId: string;
  description: string | null;
}

export interface FreeConceptRequest {
  name: string;
  barcode: string;
  price: number;
  taxId: string;
  description: string | null;
}
