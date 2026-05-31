import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthUser, BusinessBrief, LoginResponse, RegisterResponse,
  Subscription, SubscriptionStatus,
} from '../models';

const ACCESS_KEY = 'cw_access';
const REFRESH_KEY = 'cw_refresh';
const USER_KEY = 'cw_user';
const BUSINESS_KEY = 'cw_business';

// Lee y parsea un valor JSON de localStorage; devuelve null si no existe o está corrupto.
function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface RegisterPayload {
  business_name: string;
  business_email: string;
  owner_name: string;
  phone?: string;
  address?: string;
  username: string;
  password: string;
  password2: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = environment.apiUrl;

  // --- Estado reactivo (signals) ---
  // Se rehidrata desde localStorage para que la sesión (y el rol) sobreviva a recargas de página.
  readonly user = signal<AuthUser | null>(readJson<AuthUser>(USER_KEY));
  readonly business = signal<BusinessBrief | null>(readJson<BusinessBrief>(BUSINESS_KEY));
  readonly subscription = signal<Subscription | null>(null);
  readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_KEY));

  readonly isAuthenticated = computed(() => !!this.accessToken());
  readonly subscriptionStatus = computed<SubscriptionStatus>(
    () => this.subscription()?.status ?? this.business()?.subscription_status ?? 'none'
  );
  readonly isSubscriptionActive = computed(() => {
    const s = this.subscriptionStatus();
    return s === 'active' || s === 'trial';
  });
  readonly isAdmin = computed(() => {
    const r = this.user()?.role;
    return r === 'admin' || r === 'superadmin';
  });

  // --- Acciones ---
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/login/`, { username, password })
      .pipe(tap((res) => {
        this.persistTokens(res.access, res.refresh);
        this.setUser(res.user);
        this.setBusiness(res.business);
      }));
  }

  register(payload: RegisterPayload): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.api}/auth/register/`, payload)
      .pipe(tap((res) => {
        this.persistTokens(res.access, res.refresh);
        this.setUser(res.user);
        this.setBusiness({
          id: res.business.id,
          name: res.business.name,
          subscription_status: res.business.subscription_status,
          is_subscription_active: res.business.is_subscription_active,
        });
      }));
  }

  // Rehidrata el estado al recargar la página (GET /auth/me/).
  loadProfile(): Observable<AuthUser & { subscription?: Subscription }> {
    return this.http
      .get<AuthUser & { subscription?: Subscription }>(`${this.api}/auth/me/`)
      .pipe(tap((res) => {
        this.setUser({ id: res.id, username: res.username, email: res.email, full_name: res.full_name, role: res.role });
        if (res.subscription) {
          this.subscription.set(res.subscription);
          this.business.update((b) => {
            const next = b && { ...b, subscription_status: res.subscription!.status };
            if (next) localStorage.setItem(BUSINESS_KEY, JSON.stringify(next));
            return next;
          });
        }
      }));
  }

  refreshSubscription(): Observable<Subscription> {
    return this.http
      .get<Subscription>(`${this.api}/auth/subscription/`)
      .pipe(tap((sub) => this.subscription.set(sub)));
  }

  renewSubscription(): Observable<{ message: string; subscription: Subscription }> {
    return this.http
      .post<{ message: string; subscription: Subscription }>(`${this.api}/auth/subscription/renew/`, {})
      .pipe(tap((res) => this.subscription.set(res.subscription)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(BUSINESS_KEY);
    this.accessToken.set(null);
    this.user.set(null);
    this.business.set(null);
    this.subscription.set(null);
    this.router.navigate(['/login']);
  }

  // Actualizan la señal y persisten en localStorage para sobrevivir recargas.
  private setUser(u: AuthUser): void {
    this.user.set(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }

  private setBusiness(b: BusinessBrief): void {
    this.business.set(b);
    localStorage.setItem(BUSINESS_KEY, JSON.stringify(b));
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_KEY, token);
    this.accessToken.set(token);
  }

  private persistTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    this.accessToken.set(access);
  }
}
