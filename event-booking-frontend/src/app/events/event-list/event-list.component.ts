import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { EventService } from '../event.service';
import { EventItem } from '../models/event.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './event-list.component.html',
  styleUrl: './event-list.component.scss'
})
export class EventListComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly events = signal<EventItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.eventService.getEvents().subscribe({
      next: (data) => {
        this.events.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load events. Please check your connection and try again.');
      }
    });
  }

  onBookNow(event: EventItem): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/events/${event.id}` } });
      return;
    }
    // Navigate to event detail (Phase 7 will attach booking modal/page)
    this.router.navigate(['/events', event.id]);
  }

  onDelete(event: EventItem): void {
    const confirmed = window.confirm(`Are you sure you want to delete "${event.title}"?`);
    if (!confirmed) return;

    this.deletingId.set(event.id);
    this.actionMessage.set(null);

    this.eventService.deleteEvent(event.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.events.update((list) => list.filter((e) => e.id !== event.id));
        this.actionMessage.set({ type: 'success', text: `Event "${event.title}" was successfully deleted.` });
      },
      error: (err) => {
        this.deletingId.set(null);
        const msg = err.error?.message || 'Failed to delete event. Please try again.';
        this.actionMessage.set({ type: 'error', text: msg });
      }
    });
  }
}
