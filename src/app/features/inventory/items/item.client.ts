import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api-base.token';
import { Item } from './item.model';

@Injectable({ providedIn: 'root' })
export class ItemClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.baseUrl}/items`);
  }

  get(id: string): Observable<Item> {
    return this.http.get<Item>(`${this.baseUrl}/items/${id}`);
  }
}
