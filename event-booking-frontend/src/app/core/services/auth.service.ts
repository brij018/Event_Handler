import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, DecodedToken, LoginRequest, RegisterRequest, User } from '../models/auth.models';

const TOKEN_KEY = 'event_booking_token';
const USER_KEY = 'event_booking_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Reactive state signals
  readonly token = signal<string | null>(null);
  readonly currentUser = signal<User | null>(null);

  // Computed signals
  readonly isAuthenticatedSignal = computed(() => !!this.token() && !!this.currentUser());
  readonly roleSignal = computed(() => this.currentUser()?.role || null);
  readonly isAdminSignal = computed(() => this.roleSignal()?.toLowerCase() === 'admin');

  constructor() {
    this.loadInitialState();
  }

  /**
   * Register a new user account.
   */
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  /**
   * Login with email and password.
   */
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  /**
   * Logout user, clearing state and local storage.
   */
  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    if (this.isBrowser()) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Check if user is authenticated (convenience method).
   */
  isAuthenticated(): boolean {
    const currentToken = this.getToken();
    if (!currentToken) return false;

    // Check token expiration
    const isExpired = this.isTokenExpired(currentToken);
    if (isExpired) {
      this.logout();
      return false;
    }

    return !!this.currentUser();
  }

  /**
   * Get current user object.
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Get current user's role.
   */
  getRole(): string | null {
    return this.currentUser()?.role || null;
  }

  /**
   * Check if the current user has Admin role.
   */
  isAdmin(): boolean {
    return this.getRole()?.toLowerCase() === 'admin';
  }

  /**
   * Get current JWT token.
   */
  getToken(): string | null {
    return this.token();
  }

  /**
   * Save authentication payload into reactive state and localStorage.
   */
  private handleAuthSuccess(response: AuthResponse): void {
    const user: User = {
      id: response.id,
      name: response.name,
      email: response.email,
      role: response.role
    };

    this.token.set(response.token);
    this.currentUser.set(user);

    if (this.isBrowser()) {
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Load stored authentication data on app startup.
   */
  private loadInitialState(): void {
    if (!this.isBrowser()) return;

    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        if (!this.isTokenExpired(storedToken)) {
          this.token.set(storedToken);
          this.currentUser.set(JSON.parse(storedUser));
        } else {
          this.logout();
        }
      }
    } catch {
      this.logout();
    }
  }

  /**
   * Decode JWT token payload.
   */
  decodeToken(token: string): DecodedToken | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload);
    } catch {
      return null;
    }
  }

  /**
   * Check if token has expired.
   */
  private isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return false;
    const expirationDate = new Date(decoded.exp * 1000);
    return expirationDate <= new Date();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}
