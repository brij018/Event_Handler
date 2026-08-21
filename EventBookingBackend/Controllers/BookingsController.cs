using System.Security.Claims;
using EventBookingBackend.DTOs;
using EventBookingBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventBookingBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BookingsController : ControllerBase
    {
        private readonly BookingService _bookingService;

        public BookingsController(BookingService bookingService)
        {
            _bookingService = bookingService;
        }

        /// <summary>
        /// POST /api/bookings — Authenticated users. Creates a new booking.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBookingDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();
            if (userId == null)
                return Unauthorized(new { message = "Invalid user identity." });

            var (booking, error, availableSeats) = await _bookingService.CreateBookingAsync(dto, userId.Value);

            if (booking != null)
                return StatusCode(201, booking);

            // Distinguish 404 (event not found) from 409 (capacity exceeded)
            if (availableSeats.HasValue)
                return Conflict(new { message = error, availableSeats = availableSeats.Value });

            return NotFound(new { message = error });
        }

        /// <summary>
        /// GET /api/bookings/my — Authenticated users. Returns the current user's bookings.
        /// </summary>
        [HttpGet("my")]
        public async Task<IActionResult> GetMyBookings()
        {
            var userId = GetUserId();
            if (userId == null)
                return Unauthorized(new { message = "Invalid user identity." });

            var bookings = await _bookingService.GetMyBookingsAsync(userId.Value);
            return Ok(bookings);
        }

        /// <summary>
        /// GET /api/bookings — Admin only. Returns all bookings.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            var bookings = await _bookingService.GetAllBookingsAsync();
            return Ok(bookings);
        }

        /// <summary>
        /// PUT /api/bookings/{id}/cancel — Authenticated users. Cancels a booking.
        /// Owner can cancel their own; Admin can cancel any.
        /// </summary>
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            var userId = GetUserId();
            if (userId == null)
                return Unauthorized(new { message = "Invalid user identity." });

            var isAdmin = User.IsInRole("Admin");

            var (found, alreadyCancelled, authorized, booking) =
                await _bookingService.CancelBookingAsync(id, userId.Value, isAdmin);

            if (!found)
                return NotFound(new { message = $"Booking with ID {id} not found." });

            if (!authorized)
                return Forbid();

            if (alreadyCancelled)
                return BadRequest(new { message = "Booking is already cancelled.", booking });

            return Ok(new { message = "Booking cancelled successfully.", booking });
        }

        /// <summary>
        /// Extract the user ID from JWT claims.
        /// </summary>
        private int? GetUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (claim != null && int.TryParse(claim, out int userId))
                return userId;
            return null;
        }
    }
}
