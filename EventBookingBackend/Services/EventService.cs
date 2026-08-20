using EventBookingBackend.Data;
using EventBookingBackend.DTOs;
using EventBookingBackend.Models;
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
        /// Get all events with optional filtering by date and venue.
        /// </summary>
        public async Task<List<EventDto>> GetAllEventsAsync(DateTime? date, string? venue)
        {
            var query = _context.Events
                .AsNoTracking()
                .Include(e => e.CreatedBy)
                .AsQueryable();

            if (date.HasValue)
            {
                // Filter by date portion of EventDate (UTC day match)
                var filterDate = date.Value.Date;
                var nextDate = filterDate.AddDays(1);
                query = query.Where(e => e.EventDate >= filterDate.ToUniversalTime()
                                      && e.EventDate < nextDate.ToUniversalTime());
            }

            if (!string.IsNullOrWhiteSpace(venue))
            {
                query = query.Where(e => e.Venue.ToLower().Contains(venue.ToLower()));
            }

            return await query
                .OrderBy(e => e.EventDate)
                .Select(e => MapToDto(e))
                .ToListAsync();
        }

        /// <summary>
        /// Get a single event by ID.
        /// </summary>
        public async Task<EventDto?> GetEventByIdAsync(int id)
        {
            var eventEntity = await _context.Events
                .AsNoTracking()
                .Include(e => e.CreatedBy)
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

            return MapToDto(eventEntity);
        }

        /// <summary>
        /// Update an existing event.
        /// </summary>
        public async Task<EventDto?> UpdateEventAsync(int id, UpdateEventDto dto)
        {
            var eventEntity = await _context.Events
                .Include(e => e.CreatedBy)
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
        /// Map an Event entity to an EventDto.
        /// </summary>
        private static EventDto MapToDto(Event e)
        {
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
                CreatedByName = e.CreatedBy?.Name ?? string.Empty
            };
        }
    }
}
