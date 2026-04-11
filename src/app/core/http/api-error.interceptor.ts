import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Iteración 1 — interceptor mínimo que registra errores HTTP en consola
 * y los re-lanza para que cada feature decida cómo reaccionar.
 * Iteraciones posteriores añadirán toasts y manejo de 401/403.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error(
        `[API ${req.method}] ${req.urlWithParams} → ${error.status}`,
        error.error,
      );
      return throwError(() => error);
    }),
  );
};
