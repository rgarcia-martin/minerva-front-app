export type PaymentMethodType = 'CASH' | 'CARD' | 'GATEWAY';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  configuration: string | null;
}

export interface PaymentMethodRequest {
  name: string;
  type: PaymentMethodType;
  configuration: string | null;
}
