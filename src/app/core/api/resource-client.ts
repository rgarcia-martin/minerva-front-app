import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-base.token';

/**
 * Generic CRUD client for minerva-core REST resources.
 * Concrete clients only need to declare the path:
 *
 * ```ts
 * @Injectable({ providedIn: 'root' })
 * export class TaxClient extends ResourceClient<Tax, TaxRequest> {
 *   protected readonly path = '/taxes';
 * }
 * ```
 */
export abstract class ResourceClient<TResponse, TRequest> {
  protected readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  protected abstract readonly path: string;

  list(): Observable<TResponse[]> {
    return this.http.get<TResponse[]>(this.url());
  }

  get(id: string): Observable<TResponse> {
    return this.http.get<TResponse>(this.url(`/${id}`));
  }

  create(body: TRequest): Observable<TResponse> {
    return this.http.post<TResponse>(this.url(), body);
  }

  update(id: string, body: TRequest): Observable<TResponse> {
    return this.http.put<TResponse>(this.url(`/${id}`), body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/${id}`));
  }

  private url(suffix = ''): string {
    return `${this.baseUrl}${this.path}${suffix}`;
  }
}
