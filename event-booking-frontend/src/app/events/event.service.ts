import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EventItem,
  PaginatedEvents,
  CreateEventRequest,
  UpdateEventRequest
} from './models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/events`;

  /**
   * Fetch paginated events with optional date and venue filters (Public).
   */
  getEvents(
    date?: string | null,
    venue?: string | null,
    page: number = 1,
    pageSize: number = 6
  ): Observable<PaginatedEvents> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (date && date.trim() !== '') {
      params = params.set('date', date.trim());
    }

    if (venue && venue.trim() !== '') {
      params = params.set('venue', venue.trim());
    }

    return this.http.get<PaginatedEvents>(this.apiUrl, { params });
  }

  /**
   * Fetch a single event by ID (Public).
   */
  getEventById(id: number): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new event (Admin only).
   */
  createEvent(request: CreateEventRequest): Observable<EventItem> {
    return this.http.post<EventItem>(this.apiUrl, request);
  }

  /**
   * Update an existing event (Admin only).
   */
  updateEvent(id: number, request: UpdateEventRequest): Observable<EventItem> {
    return this.http.put<EventItem>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Delete an event by ID (Admin only).
   */
  deleteEvent(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
