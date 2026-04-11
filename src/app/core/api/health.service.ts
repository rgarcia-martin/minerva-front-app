import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { API_BASE_URL } from './api-base.token';

export interface ApiHealth {
  online: boolean;
  message: string;
}

/**
 * Lightweight probe against minerva-core. Hits `/taxes` because it always
 * returns a JSON array (empty or not) and is the cheapest CRUD endpoint
 * available in the current API surface.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  ping(): Observable<ApiHealth> {
    return this.http.get<unknown[]>(`${this.baseUrl}/taxes`).pipe(
      map(() => ({
        online: true,
        message: 'minerva-core responde correctamente',
      })),
      catchError((err: { status?: number }) =>
        of({
          online: false,
          message: `minerva-core no responde (HTTP ${err?.status ?? 'sin código'})`,
        }),
      ),
    );
  }
}
