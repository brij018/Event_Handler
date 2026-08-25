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
  availableSeats: number;
}

export interface PaginatedEvents {
  items: EventItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
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
