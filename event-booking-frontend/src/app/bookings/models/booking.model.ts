export interface BookingItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  eventId: number;
  eventTitle: string;
  numberOfSeats: number;
  status: string; // 'Confirmed' | 'Cancelled'
  bookingDate: string;
}

export interface CreateBookingRequest {
  eventId: number;
  numberOfSeats: number;
}
