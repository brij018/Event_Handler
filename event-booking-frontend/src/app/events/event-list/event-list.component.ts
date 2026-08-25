import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventService } from '../event.service';
import { EventItem, PaginatedEvents } from '../models/event.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './event-list.component.html',
  styleUrl: './event-list.component.scss'
})
export class EventListComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly events = signal<EventItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly deletingId = signal<number | null>(null);

  // Filter state
  filterDate: string = '';
  filterVenue: string = '';

  // Pagination state
  readonly currentPage = signal(1);
  readonly pageSize = signal(6);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly hasPreviousPage = signal(false);
  readonly hasNextPage = signal(false);

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.eventService.getEvents(
      this.filterDate,
      this.filterVenue,
      this.currentPage(),
      this.pageSize()
    ).subscribe({
      next: (res: PaginatedEvents) => {
        this.events.set(res.items);
        this.totalCount.set(res.totalCount);
        this.totalPages.set(res.totalPages);
        this.hasPreviousPage.set(res.hasPreviousPage);
        this.hasNextPage.set(res.hasNextPage);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load events. Please check your connection.');
        this.notification.error('Failed to load events.');
      }
    });
  }

  onApplyFilters(): void {
    this.currentPage.set(1);
    this.loadEvents();
  }

  onResetFilters(): void {
    this.filterDate = '';
    this.filterVenue = '';
    this.currentPage.set(1);
    this.loadEvents();
  }

  hasActiveFilters(): boolean {
    return !!this.filterDate || !!this.filterVenue.trim();
  }

  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages() && newPage !== this.currentPage()) {
      this.currentPage.set(newPage);
      this.loadEvents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onBookNow(event: EventItem): void {
    if (event.availableSeats <= 0) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/book?eventId=${event.id}` } });
      return;
    }
    this.router.navigate(['/book'], { queryParams: { eventId: event.id } });
  }

  onDelete(event: EventItem): void {
    const confirmed = window.confirm(`Are you sure you want to delete "${event.title}"?`);
    if (!confirmed) return;

    this.deletingId.set(event.id);

    this.eventService.deleteEvent(event.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.notification.success(`Event "${event.title}" deleted.`);
        this.loadEvents();
      },
      error: (err) => {
        this.deletingId.set(null);
        const msg = err.error?.message || 'Failed to delete event. It may have existing bookings.';
        this.notification.error(msg);
      }
    });
  }
}
