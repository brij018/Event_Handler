using System.ComponentModel.DataAnnotations;
using EventBookingBackend.Models.Enums;

namespace EventBookingBackend.Models
{
    public class Booking
    {
        public int Id { get; set; }

        // Foreign keys
        [Required]
        public int UserId { get; set; }

        [Required]
        public int EventId { get; set; }

        [Required]
        public int NumberOfSeats { get; set; }

        [Required]
        public BookingStatus Status { get; set; }

        [Required]
        public DateTime BookingDate { get; set; }

        // Navigation properties
        public User User { get; set; } = null!;
        public Event Event { get; set; } = null!;
    }
}
