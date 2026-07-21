import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config';

function buildParams(params?: Record<string, string | number | boolean | undefined>): HttpParams {
  let httpParams = new HttpParams();
  if (!params) return httpParams;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}

function toError(err: HttpErrorResponse): Observable<never> {
  const message = typeof err.error === 'string' && err.error ? err.error : `HTTP ${err.status}`;
  return throwError(() => new Error(message));
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private http = inject(HttpClient);

  getJson<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Observable<T> {
    return this.http
      .get<T>(`${API_BASE_URL}/${path}`, { params: buildParams(params) })
      .pipe(catchError(toError));
  }

  postJson<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(`${API_BASE_URL}/${path}`, body ?? {}).pipe(catchError(toError));
  }

  putJson<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<T>(`${API_BASE_URL}/${path}`, body ?? {}).pipe(catchError(toError));
  }

  deleteJson<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${API_BASE_URL}/${path}`).pipe(catchError(toError));
  }
}
