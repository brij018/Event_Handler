import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingService } from '../booking.service';
import { EventService } from '../../events/event.service';
import { EventItem } from '../../events/models/event.model';
import { BookingItem } from '../models/booking.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.scss'
})
export class BookingFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly bookingService = inject(BookingService);
  private readonly eventService = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly event = signal<EventItem | null>(null);
  readonly isLoadingEvent = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly confirmedBooking = signal<BookingItem | null>(null);

  readonly bookingForm: FormGroup = this.fb.group({
    numberOfSeats: [1, [Validators.required, Validators.min(1), Validators.max(100)]]
  });

  // Computed total cost based on current seat input
  readonly totalCost = computed(() => {
    const currentEvent = this.event();
    if (!currentEvent) return 0;
    const seats = Number(this.bookingForm.get('numberOfSeats')?.value) || 0;
    return seats * currentEvent.price;
  });

  ngOnInit(): void {
    // Check route param first (:eventId), then query param (?eventId)
    const paramId = this.route.snapshot.paramMap.get('eventId');
    const queryId = this.route.snapshot.queryParamMap.get('eventId');
    const idStr = paramId || queryId;
    const eventId = idStr ? parseInt(idStr, 10) : NaN;

    if (isNaN(eventId) || eventId <= 0) {
      this.errorMessage.set('Invalid event ID specified. Please select an event to book.');
      this.isLoadingEvent.set(false);
      return;
    }

    this.loadEvent(eventId);
  }

  get f() {
    return this.bookingForm.controls;
  }

  loadEvent(id: number): void {
    this.isLoadingEvent.set(true);
    this.errorMessage.set(null);

    this.eventService.getEventById(id).subscribe({
      next: (data) => {
        this.event.set(data);
        this.isLoadingEvent.set(false);
      },
      error: (err) => {
        this.isLoadingEvent.set(false);
        if (err.status === 404) {
          this.errorMessage.set('The specified event does not exist.');
        } else {
          this.errorMessage.set('Unable to load event details for booking.');
        }
      }
    });
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const currentEvent = this.event();
    if (!currentEvent) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const seats = Number(this.bookingForm.get('numberOfSeats')?.value);

    this.bookingService.createBooking(currentEvent.id, seats).subscribe({
      next: (booking) => {
        this.isSubmitting.set(false);
        this.confirmedBooking.set(booking);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          const availableSeats = err.error?.availableSeats;
          if (availableSeats !== undefined) {
            this.errorMessage.set(`Capacity exceeded: Only ${availableSeats} seat(s) are currently available for this event.`);
          } else {
            this.errorMessage.set(err.error?.message || 'Not enough seats available for this event.');
          }
        } else if (err.status === 400) {
          this.errorMessage.set(err.error?.message || 'Please check your booking quantity.');
        } else if (err.status === 401) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
        } else {
          this.errorMessage.set(err.error?.message || 'An error occurred while creating your booking. Please try again.');
        }
      }
    });
  }
}
