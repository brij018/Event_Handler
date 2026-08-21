using EventBookingBackend.Data;
using EventBookingBackend.DTOs;
using EventBookingBackend.Models;
using EventBookingBackend.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EventBookingBackend.Services
{
    public class BookingService
    {
        private readonly AppDbContext _context;

        public BookingService(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Create a booking with capacity check inside a serializable transaction
        /// to prevent race-condition overbooking.
        /// </summary>
        public async Task<(BookingDto? Booking, string? Error, int? AvailableSeats)> CreateBookingAsync(
            CreateBookingDto dto, int userId)
        {
            // Use a serializable transaction so the capacity check + insert is atomic.
            // This prevents two concurrent requests from both reading the same
            // remaining capacity and both succeeding past the limit.
            using var transaction = await _context.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable);

            try
            {
                var eventEntity = await _context.Events
                    .FirstOrDefaultAsync(e => e.Id == dto.EventId);

                if (eventEntity == null)
                    return (null, $"Event with ID {dto.EventId} not found.", null);

                // Calculate occupied seats (only Confirmed bookings count)
                var occupiedSeats = await _context.Bookings
                    .Where(b => b.EventId == dto.EventId && b.Status == BookingStatus.Confirmed)
                    .SumAsync(b => b.NumberOfSeats);

                var remainingCapacity = eventEntity.Capacity - occupiedSeats;

                if (dto.NumberOfSeats > remainingCapacity)
                {
                    await transaction.RollbackAsync();
                    return (null, "Not enough seats available for this event.", remainingCapacity);
                }

                var booking = new Booking
                {
                    UserId = userId,
                    EventId = dto.EventId,
                    NumberOfSeats = dto.NumberOfSeats,
                    Status = BookingStatus.Confirmed,
                    BookingDate = DateTime.UtcNow
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Reload navigations for the response DTO
                await _context.Entry(booking).Reference(b => b.User).LoadAsync();
                await _context.Entry(booking).Reference(b => b.Event).LoadAsync();

                return (MapToDto(booking), null, null);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Get bookings for the currently authenticated user.
        /// </summary>
        public async Task<List<BookingDto>> GetMyBookingsAsync(int userId)
        {
            return await _context.Bookings
                .AsNoTracking()
                .Include(b => b.User)
                .Include(b => b.Event)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.BookingDate)
                .Select(b => MapToDto(b))
                .ToListAsync();
        }

        /// <summary>
        /// Get all bookings (Admin only).
        /// </summary>
        public async Task<List<BookingDto>> GetAllBookingsAsync()
        {
            return await _context.Bookings
                .AsNoTracking()
                .Include(b => b.User)
                .Include(b => b.Event)
                .OrderByDescending(b => b.BookingDate)
                .Select(b => MapToDto(b))
                .ToListAsync();
        }

        /// <summary>
        /// Cancel a booking. Returns a tuple indicating the result.
        /// </summary>
        public async Task<(bool Found, bool AlreadyCancelled, bool Authorized, BookingDto? Booking)>
            CancelBookingAsync(int bookingId, int userId, bool isAdmin)
        {
            var booking = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Event)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null)
                return (false, false, false, null);

            // Authorization: owner or admin
            if (booking.UserId != userId && !isAdmin)
                return (true, false, false, null);

            if (booking.Status == BookingStatus.Cancelled)
                return (true, true, true, MapToDto(booking));

            booking.Status = BookingStatus.Cancelled;
            await _context.SaveChangesAsync();

            return (true, false, true, MapToDto(booking));
        }

        /// <summary>
        /// Map a Booking entity to a BookingDto.
        /// </summary>
        private static BookingDto MapToDto(Booking b)
        {
            return new BookingDto
            {
                Id = b.Id,
                UserId = b.UserId,
                UserName = b.User?.Name ?? string.Empty,
                UserEmail = b.User?.Email ?? string.Empty,
                EventId = b.EventId,
                EventTitle = b.Event?.Title ?? string.Empty,
                NumberOfSeats = b.NumberOfSeats,
                Status = b.Status.ToString(),
                BookingDate = b.BookingDate
            };
        }
    }
}
