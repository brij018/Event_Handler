import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../event.service';
import { EventItem } from '../models/event.model';
import { AuthService } from '../../core/services/auth.service';

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
        }
      }
    });
  }

  onBookNow(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }
    // Placeholder action for booking (Phase 7 feature)
    window.alert(`Booking feature placeholder: You selected "${this.event()?.title}". Complete booking UI will be available in Phase 7.`);
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
        this.router.navigate(['/events']);
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.actionError.set(err.error?.message || 'Failed to delete event.');
      }
    });
  }
}
