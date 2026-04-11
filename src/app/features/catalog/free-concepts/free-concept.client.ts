import { Injectable } from '@angular/core';

import { ResourceClient } from '../../../core/api/resource-client';
import { FreeConcept, FreeConceptRequest } from './free-concept.model';

@Injectable({ providedIn: 'root' })
export class FreeConceptClient extends ResourceClient<FreeConcept, FreeConceptRequest> {
  protected readonly path = '/free-concepts';
}
