import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated } from '../models';

// Servicio CRUD genérico. Cada recurso del backend (clients, vehicles, ...)
// se consume creando una instancia tipada con resource('clients').
export class ResourceClient<T> {
  constructor(
    private http: HttpClient,
    private base: string,
    private path: string,
  ) {}

  private url(extra = ''): string {
    return `${this.base}/${this.path}/${extra}`;
  }

  // Devuelve solo los resultados (desempaqueta la paginación de DRF).
  list(params: Record<string, string | number | undefined> = {}): Observable<T[]> {
    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    }
    return this.http
      .get<Paginated<T> | T[]>(this.url(), { params: httpParams })
      .pipe(map((res) => (Array.isArray(res) ? res : res.results)));
  }

  get(id: number): Observable<T> {
    return this.http.get<T>(this.url(`${id}/`));
  }

  create(body: Record<string, unknown>): Observable<T> {
    return this.http.post<T>(this.url(), body);
  }

  update(id: number, body: Record<string, unknown>): Observable<T> {
    return this.http.put<T>(this.url(`${id}/`), body);
  }

  patch(id: number, body: Record<string, unknown>): Observable<T> {
    return this.http.patch<T>(this.url(`${id}/`), body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${id}/`));
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  resource<T>(path: string): ResourceClient<T> {
    return new ResourceClient<T>(this.http, this.base, path);
  }

  dashboard<T>(): Observable<T> {
    return this.http.get<T>(`${this.base}/dashboard/`);
  }
}
