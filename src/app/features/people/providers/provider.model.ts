export interface Provider {
  id: string;
  businessName: string;
  taxIdentifier: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  appliesSurcharge: boolean;
}

export interface ProviderRequest {
  businessName: string;
  taxIdentifier: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  appliesSurcharge: boolean;
}
