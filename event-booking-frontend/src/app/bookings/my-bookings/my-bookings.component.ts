import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService } from '../booking.service';
import { BookingItem } from '../models/booking.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss'
})
export class MyBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly bookings = signal<BookingItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly cancellingId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadMyBookings();
  }

  loadMyBookings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        this.bookings.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load your bookings. Please check your connection.');
        this.notification.error('Failed to load bookings.');
      }
    });
  }

  onCancelBooking(booking: BookingItem): void {
    const confirmed = window.confirm(`Are you sure you want to cancel your booking for "${booking.eventTitle}" (${booking.numberOfSeats} seat(s))?`);
    if (!confirmed) return;

    this.cancellingId.set(booking.id);

    this.bookingService.cancelBooking(booking.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.bookings.update((list) =>
          list.map((b) => (b.id === booking.id ? { ...b, status: 'Cancelled' } : b))
        );
        this.notification.success(`Booking #${booking.id} for "${booking.eventTitle}" cancelled.`);
      },
      error: (err) => {
        this.cancellingId.set(null);
        if (err.status === 400 && err.error?.booking) {
          this.bookings.update((list) =>
            list.map((b) => (b.id === booking.id ? { ...b, status: 'Cancelled' } : b))
          );
        }
        const msg = err.error?.message || 'Failed to cancel booking. Please try again.';
        this.notification.error(msg);
      }
    });
  }
}
