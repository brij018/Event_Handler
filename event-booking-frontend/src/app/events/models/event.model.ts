export interface EventItem {
  id: number;
  title: string;
  description?: string;
  venue: string;
  eventDate: string;
  startTime?: string;
  capacity: number;
  price: number;
  createdById: number;
  createdByName: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  venue: string;
  eventDate: string;
  startTime?: string;
  capacity: number;
  price: number;
}

export interface UpdateEventRequest {
  title: string;
  description?: string;
  venue: string;
  eventDate: string;
  startTime?: string;
  capacity: number;
  price: number;
}
