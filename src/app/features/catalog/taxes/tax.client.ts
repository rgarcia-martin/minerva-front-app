import { Injectable } from '@angular/core';

import { ResourceClient } from '../../../core/api/resource-client';
import { Tax, TaxRequest } from './tax.model';

@Injectable({ providedIn: 'root' })
export class TaxClient extends ResourceClient<Tax, TaxRequest> {
  protected readonly path = '/taxes';
}
