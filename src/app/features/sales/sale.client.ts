import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ResourceClient } from '../../core/api/resource-client';
import { Sale, SaleRequest } from './sale.model';

/**
 * HTTP client for /api/v1/sales. Sales are immutable — `update()` inherited from
 * ResourceClient is not supported by the backend and must not be called from the UI.
 */
@Injectable({ providedIn: 'root' })
export class SaleClient extends ResourceClient<Sale, SaleRequest> {
  protected readonly path = '/sales';

  override update(): Observable<Sale> {
    throw new Error('Sales are immutable: update is not supported.');
  }
}
