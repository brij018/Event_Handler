using System.Security.Claims;
using EventBookingBackend.DTOs;
using EventBookingBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventBookingBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly EventService _eventService;

        public EventsController(EventService eventService)
        {
            _eventService = eventService;
        }

        /// <summary>
        /// GET /api/events — Public. Returns all events with optional date/venue filtering.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] DateTime? date, [FromQuery] string? venue)
        {
            var events = await _eventService.GetAllEventsAsync(date, venue);
            return Ok(events);
        }

        /// <summary>
        /// GET /api/events/{id} — Public. Returns a single event by ID.
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var eventDto = await _eventService.GetEventByIdAsync(id);

            if (eventDto == null)
                return NotFound(new { message = $"Event with ID {id} not found." });

            return Ok(eventDto);
        }

        /// <summary>
        /// POST /api/events — Admin only. Creates a new event.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateEventDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Custom validation: EventDate must be in the future
            if (dto.EventDate.ToUniversalTime() <= DateTime.UtcNow)
                return BadRequest(new { message = "Event date must be in the future." });

            // Get the authenticated admin's user ID from JWT claims
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim, out int createdById))
                return Unauthorized(new { message = "Invalid user identity." });

            var createdEvent = await _eventService.CreateEventAsync(dto, createdById);
            return CreatedAtAction(nameof(GetById), new { id = createdEvent.Id }, createdEvent);
        }

        /// <summary>
        /// PUT /api/events/{id} — Admin only. Updates an existing event.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateEventDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Custom validation: EventDate must be in the future
            if (dto.EventDate.ToUniversalTime() <= DateTime.UtcNow)
                return BadRequest(new { message = "Event date must be in the future." });

            var updatedEvent = await _eventService.UpdateEventAsync(id, dto);

            if (updatedEvent == null)
                return NotFound(new { message = $"Event with ID {id} not found." });

            return Ok(updatedEvent);
        }

        /// <summary>
        /// DELETE /api/events/{id} — Admin only. Deletes an event.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _eventService.DeleteEventAsync(id);

                if (!deleted)
                    return NotFound(new { message = $"Event with ID {id} not found." });

                return Ok(new { message = $"Event with ID {id} deleted successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
