import { Injectable } from '@angular/core';

import { ResourceClient } from '../../../core/api/resource-client';
import { User, UserRequest } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserClient extends ResourceClient<User, UserRequest> {
  protected readonly path = '/users';
}
