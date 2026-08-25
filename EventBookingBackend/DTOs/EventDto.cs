namespace EventBookingBackend.DTOs
{
    public class EventDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Venue { get; set; } = string.Empty;
        public DateTime EventDate { get; set; }
        public TimeSpan? StartTime { get; set; }
        public int Capacity { get; set; }
        public decimal Price { get; set; }
        public int CreatedById { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public int AvailableSeats { get; set; }
    }
}
