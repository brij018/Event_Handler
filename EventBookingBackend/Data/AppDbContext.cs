using Microsoft.EntityFrameworkCore;
using EventBookingBackend.Models;
using EventBookingBackend.Models.Enums;

namespace EventBookingBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Event> Events => Set<Event>();
        public DbSet<Booking> Bookings => Set<Booking>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ----- User configuration -----
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.Id);

                entity.Property(u => u.Name)
                      .IsRequired()
                      .HasMaxLength(100);

                entity.Property(u => u.Email)
                      .IsRequired()
                      .HasMaxLength(200);

                entity.HasIndex(u => u.Email)
                      .IsUnique();

                entity.Property(u => u.PasswordHash)
                      .IsRequired()
                      .HasMaxLength(500);

                entity.Property(u => u.Role)
                      .IsRequired()
                      .HasConversion<string>()
                      .HasMaxLength(20);
            });

            // ----- Event configuration -----
            modelBuilder.Entity<Event>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title)
                      .IsRequired()
                      .HasMaxLength(200);

                entity.Property(e => e.Description)
                      .HasMaxLength(2000);

                entity.Property(e => e.Venue)
                      .IsRequired()
                      .HasMaxLength(300);

                entity.Property(e => e.EventDate)
                      .IsRequired();

                entity.Property(e => e.Capacity)
                      .IsRequired();

                entity.Property(e => e.Price)
                      .HasColumnType("decimal(10,2)");

                // Event.CreatedById → User.Id
                entity.HasOne(e => e.CreatedBy)
                      .WithMany(u => u.CreatedEvents)
                      .HasForeignKey(e => e.CreatedById)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ----- Booking configuration -----
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.HasKey(b => b.Id);

                entity.Property(b => b.NumberOfSeats)
                      .IsRequired();

                entity.Property(b => b.Status)
                      .IsRequired()
                      .HasConversion<string>()
                      .HasMaxLength(20);

                entity.Property(b => b.BookingDate)
                      .IsRequired();

                // Booking.UserId → User.Id
                entity.HasOne(b => b.User)
                      .WithMany(u => u.Bookings)
                      .HasForeignKey(b => b.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Booking.EventId → Event.Id
                entity.HasOne(b => b.Event)
                      .WithMany(e => e.Bookings)
                      .HasForeignKey(b => b.EventId)
                      .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
