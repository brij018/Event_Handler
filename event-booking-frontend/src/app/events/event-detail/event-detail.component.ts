import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../event.service';
import { EventItem } from '../models/event.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.scss'
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly event = signal<EventItem | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly isDeleting = signal(false);
  readonly actionError = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;

    if (isNaN(id) || id <= 0) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    this.loadEvent(id);
  }

  loadEvent(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.notFound.set(false);

    this.eventService.getEventById(id).subscribe({
      next: (data) => {
        this.event.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.errorMessage.set('Unable to load event details. Please try again.');
          this.notification.error('Failed to load event details.');
        }
      }
    });
  }

  onBookNow(): void {
    const currentEvent = this.event();
    if (!currentEvent || currentEvent.availableSeats <= 0) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/book?eventId=${currentEvent.id}` }
      });
      return;
    }
    this.router.navigate(['/book'], {
      queryParams: { eventId: currentEvent.id }
    });
  }

  onDelete(): void {
    const currentEvent = this.event();
    if (!currentEvent) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${currentEvent.title}"?`);
    if (!confirmed) return;

    this.isDeleting.set(true);
    this.actionError.set(null);

    this.eventService.deleteEvent(currentEvent.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.notification.success(`Event "${currentEvent.title}" was deleted.`);
        this.router.navigate(['/events']);
      },
      error: (err) => {
        this.isDeleting.set(false);
        const msg = err.error?.message || 'Failed to delete event. It may have active bookings.';
        this.actionError.set(msg);
        this.notification.error(msg);
      }
    });
  }
}
