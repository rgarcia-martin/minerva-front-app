import { Injectable } from '@angular/core';

import { ResourceClient } from '../../../core/api/resource-client';
import { PaymentMethod, PaymentMethodRequest } from './payment-method.model';

@Injectable({ providedIn: 'root' })
export class PaymentMethodClient extends ResourceClient<PaymentMethod, PaymentMethodRequest> {
  protected readonly path = '/payment-methods';
}
