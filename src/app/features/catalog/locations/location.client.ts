import { Injectable } from '@angular/core';

import { ResourceClient } from '../../../core/api/resource-client';
import { Location, LocationRequest } from './location.model';

@Injectable({ providedIn: 'root' })
export class LocationClient extends ResourceClient<Location, LocationRequest> {
  protected readonly path = '/locations';
}
