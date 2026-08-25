import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BookingService } from '../../bookings/booking.service';
import { EventService } from '../../events/event.service';
import { BookingItem } from '../../bookings/models/booking.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly eventService = inject(EventService);
  readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly bookings = signal<BookingItem[]>([]);
  readonly totalEventsCount = signal(0);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly cancellingId = signal<number | null>(null);

  // Summary counts
  readonly totalEvents = computed(() => this.totalEventsCount());
  readonly totalBookings = computed(() => this.bookings().length);
  readonly confirmedBookings = computed(() => this.bookings().filter(b => b.status === 'Confirmed').length);
  readonly cancelledBookings = computed(() => this.bookings().filter(b => b.status === 'Cancelled').length);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      eventsRes: this.eventService.getEvents(null, null, 1, 100),
      bookings: this.bookingService.getAllBookings()
    }).subscribe({
      next: ({ eventsRes, bookings }) => {
        this.totalEventsCount.set(eventsRes.totalCount);
        this.bookings.set(bookings);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load admin dashboard data. Please try again.');
        this.notification.error('Failed to load dashboard data.');
      }
    });
  }

  onCancelBooking(booking: BookingItem): void {
    const confirmed = window.confirm(`Admin action: Are you sure you want to cancel booking #${booking.id} for "${booking.userName}" on event "${booking.eventTitle}"?`);
    if (!confirmed) return;

    this.cancellingId.set(booking.id);

    this.bookingService.cancelBooking(booking.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.bookings.update((list) =>
          list.map((b) => (b.id === booking.id ? { ...b, status: 'Cancelled' } : b))
        );
        this.notification.success(`Booking #${booking.id} cancelled by Admin.`);
      },
      error: (err) => {
        this.cancellingId.set(null);
        const msg = err.error?.message || 'Failed to cancel booking.';
        this.notification.error(msg);
      }
    });
  }
}
