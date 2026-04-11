import { Injectable } from '@angular/core';

import { ResourceClient } from '../../core/api/resource-client';
import { Purchase, PurchaseRequest } from './purchase.model';

@Injectable({ providedIn: 'root' })
export class PurchaseClient extends ResourceClient<Purchase, PurchaseRequest> {
  protected readonly path = '/purchases';
}
