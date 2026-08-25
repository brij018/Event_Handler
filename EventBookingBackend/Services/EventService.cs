using EventBookingBackend.Data;
using EventBookingBackend.DTOs;
using EventBookingBackend.Models;
using EventBookingBackend.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EventBookingBackend.Services
{
    public class EventService
    {
        private readonly AppDbContext _context;

        public EventService(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Get all events with optional filtering by date and venue, and server-side pagination.
        /// </summary>
        public async Task<PaginatedResult<EventDto>> GetAllEventsAsync(DateTime? date, string? venue, int page = 1, int pageSize = 6)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 6;

            var baseQuery = _context.Events
                .AsNoTracking()
                .AsQueryable();

            if (date.HasValue)
            {
                var filterDate = date.Value.Date;
                var nextDate = filterDate.AddDays(1);
                baseQuery = baseQuery.Where(e => e.EventDate >= filterDate.ToUniversalTime()
                                              && e.EventDate < nextDate.ToUniversalTime());
            }

            if (!string.IsNullOrWhiteSpace(venue))
            {
                baseQuery = baseQuery.Where(e => e.Venue.ToLower().Contains(venue.ToLower()));
            }

            var totalCount = await baseQuery.CountAsync();

            var events = await baseQuery
                .Include(e => e.CreatedBy)
                .Include(e => e.Bookings)
                .OrderBy(e => e.EventDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => MapToDto(e))
                .ToListAsync();

            return new PaginatedResult<EventDto>
            {
                Items = events,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        /// <summary>
        /// Get a single event by ID with calculated available seats.
        /// </summary>
        public async Task<EventDto?> GetEventByIdAsync(int id)
        {
            var eventEntity = await _context.Events
                .AsNoTracking()
                .Include(e => e.CreatedBy)
                .Include(e => e.Bookings)
                .FirstOrDefaultAsync(e => e.Id == id);

            return eventEntity == null ? null : MapToDto(eventEntity);
        }

        /// <summary>
        /// Create a new event.
        /// </summary>
        public async Task<EventDto> CreateEventAsync(CreateEventDto dto, int createdById)
        {
            var eventEntity = new Event
            {
                Title = dto.Title,
                Description = dto.Description,
                Venue = dto.Venue,
                EventDate = DateTime.SpecifyKind(dto.EventDate, DateTimeKind.Utc),
                StartTime = dto.StartTime,
                Capacity = dto.Capacity,
                Price = dto.Price,
                CreatedById = createdById
            };

            _context.Events.Add(eventEntity);
            await _context.SaveChangesAsync();

            // Reload with CreatedBy navigation for the response
            await _context.Entry(eventEntity).Reference(e => e.CreatedBy).LoadAsync();
            await _context.Entry(eventEntity).Collection(e => e.Bookings).LoadAsync();

            return MapToDto(eventEntity);
        }

        /// <summary>
        /// Update an existing event.
        /// </summary>
        public async Task<EventDto?> UpdateEventAsync(int id, UpdateEventDto dto)
        {
            var eventEntity = await _context.Events
                .Include(e => e.CreatedBy)
                .Include(e => e.Bookings)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (eventEntity == null)
                return null;

            eventEntity.Title = dto.Title;
            eventEntity.Description = dto.Description;
            eventEntity.Venue = dto.Venue;
            eventEntity.EventDate = DateTime.SpecifyKind(dto.EventDate, DateTimeKind.Utc);
            eventEntity.StartTime = dto.StartTime;
            eventEntity.Capacity = dto.Capacity;
            eventEntity.Price = dto.Price;

            await _context.SaveChangesAsync();

            return MapToDto(eventEntity);
        }

        /// <summary>
        /// Delete an event by ID. Returns false if not found.
        /// </summary>
        public async Task<bool> DeleteEventAsync(int id)
        {
            var eventEntity = await _context.Events
                .Include(e => e.Bookings)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (eventEntity == null)
                return false;

            if (eventEntity.Bookings.Any())
            {
                throw new InvalidOperationException(
                    "Cannot delete an event that has existing bookings. Cancel the bookings first.");
            }

            _context.Events.Remove(eventEntity);
            await _context.SaveChangesAsync();

            return true;
        }

        /// <summary>
        /// Map an Event entity to an EventDto with real-time remaining capacity.
        /// </summary>
        private static EventDto MapToDto(Event e)
        {
            var confirmedBookedSeats = e.Bookings != null
                ? e.Bookings.Where(b => b.Status == BookingStatus.Confirmed).Sum(b => b.NumberOfSeats)
                : 0;

            var availableSeats = Math.Max(0, e.Capacity - confirmedBookedSeats);

            return new EventDto
            {
                Id = e.Id,
                Title = e.Title,
                Description = e.Description,
                Venue = e.Venue,
                EventDate = e.EventDate,
                StartTime = e.StartTime,
                Capacity = e.Capacity,
                Price = e.Price,
                CreatedById = e.CreatedById,
                CreatedByName = e.CreatedBy?.Name ?? string.Empty,
                AvailableSeats = availableSeats
            };
        }
    }
}
