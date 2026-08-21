using System.ComponentModel.DataAnnotations;

namespace EventBookingBackend.DTOs
{
    public class CreateBookingDto
    {
        [Required(ErrorMessage = "Event ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Event ID must be a positive integer.")]
        public int EventId { get; set; }

        [Required(ErrorMessage = "Number of seats is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Number of seats must be at least 1.")]
        public int NumberOfSeats { get; set; }
    }
}
