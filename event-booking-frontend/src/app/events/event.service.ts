import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateEventRequest, EventItem, UpdateEventRequest } from './models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/events`;

  /**
   * Fetch all events with optional date and venue filters.
   */
  getEvents(date?: string, venue?: string): Observable<EventItem[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    if (venue) {
      params = params.set('venue', venue);
    }
    return this.http.get<EventItem[]>(this.apiUrl, { params });
  }

  /**
   * Fetch a single event by ID.
   */
  getEventById(id: number): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new event (Admin only).
   */
  createEvent(event: CreateEventRequest): Observable<EventItem> {
    return this.http.post<EventItem>(this.apiUrl, event);
  }

  /**
   * Update an existing event by ID (Admin only).
   */
  updateEvent(id: number, event: UpdateEventRequest): Observable<EventItem> {
    return this.http.put<EventItem>(`${this.apiUrl}/${id}`, event);
  }

  /**
   * Delete an event by ID (Admin only).
   */
  deleteEvent(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
