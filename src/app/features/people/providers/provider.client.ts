import { Injectable } from '@angular/core';

import { ResourceClient } from '../../../core/api/resource-client';
import { Provider, ProviderRequest } from './provider.model';

@Injectable({ providedIn: 'root' })
export class ProviderClient extends ResourceClient<Provider, ProviderRequest> {
  protected readonly path = '/providers';
}
