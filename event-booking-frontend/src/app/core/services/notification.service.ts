import { Injectable, signal } from '@angular/core';

export interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private nextId = 1;
  readonly toasts = signal<ToastNotification[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', durationMs: number = 4500): void {
    const id = this.nextId++;
    const toast: ToastNotification = { id, type, message };

    this.toasts.update((current) => [...current, toast]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
    }
  }

  success(message: string, durationMs: number = 4500): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs: number = 5500): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs: number = 4500): void {
    this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs: number = 5000): void {
    this.show(message, 'warning', durationMs);
  }

  dismiss(id: number): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
