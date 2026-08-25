import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BookingItem, CreateBookingRequest } from './models/booking.model';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/bookings`;

  /**
   * Create a new booking (Authenticated users).
   */
  createBooking(eventId: number, numberOfSeats: number): Observable<BookingItem> {
    const payload: CreateBookingRequest = {
      eventId,
      numberOfSeats
    };
    return this.http.post<BookingItem>(this.apiUrl, payload);
  }

  /**
   * Get all bookings for the currently authenticated user.
   */
  getMyBookings(): Observable<BookingItem[]> {
    return this.http.get<BookingItem[]>(`${this.apiUrl}/my`);
  }

  /**
   * Get all bookings across all users (Admin only).
   */
  getAllBookings(): Observable<BookingItem[]> {
    return this.http.get<BookingItem[]>(this.apiUrl);
  }

  /**
   * Cancel an existing booking by ID (Owner or Admin).
   */
  cancelBooking(id: number): Observable<{ message: string; booking: BookingItem }> {
    return this.http.put<{ message: string; booking: BookingItem }>(`${this.apiUrl}/${id}/cancel`, {});
  }
}
