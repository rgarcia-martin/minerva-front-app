export interface Tax {
  id: string;
  description: string;
  rate: number;
  surchargeRate: number;
}

export interface TaxRequest {
  description: string;
  rate: number;
  surchargeRate: number;
}
