using EventBookingBackend.Data;
using EventBookingBackend.DTOs;
using EventBookingBackend.Models;
using EventBookingBackend.Models.Enums;
using EventBookingBackend.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EventBookingBackend.Tests.Services
{
    public class BookingServiceTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly DbContextOptions<AppDbContext> _options;

        public BookingServiceTests()
        {
            // Set up an isolated in-memory SQLite database connection
            _connection = new SqliteConnection("Filename=:memory:");
            _connection.Open();

            _options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(_connection)
                .Options;

            // Create schema
            using var context = CreateContext();
            context.Database.EnsureCreated();
        }

        private AppDbContext CreateContext() => new AppDbContext(_options);

        public void Dispose()
        {
            _connection.Dispose();
        }

        private async Task<(User Organizer, User User1, User User2, Event Event)> SeedBaseDataAsync(
            int capacity = 100, decimal price = 25.00m)
        {
            using var context = CreateContext();

            var organizer = new User
            {
                Name = "Admin Organizer",
                Email = "admin@test.com",
                PasswordHash = "hashed_pw",
                Role = Role.Admin
            };

            var user1 = new User
            {
                Name = "Alice Student",
                Email = "alice@university.edu",
                PasswordHash = "hashed_pw",
                Role = Role.User
            };

            var user2 = new User
            {
                Name = "Bob Student",
                Email = "bob@university.edu",
                PasswordHash = "hashed_pw",
                Role = Role.User
            };

            context.Users.AddRange(organizer, user1, user2);
            await context.SaveChangesAsync();

            var eventEntity = new Event
            {
                Title = "University Tech Expo",
                Description = "Annual exhibition",
                Venue = "Main Hall",
                EventDate = DateTime.UtcNow.AddDays(7),
                Capacity = capacity,
                Price = price,
                CreatedById = organizer.Id
            };

            context.Events.Add(eventEntity);
            await context.SaveChangesAsync();

            return (organizer, user1, user2, eventEntity);
        }

        #region Required Test Cases

        [Fact]
        public async Task CreateBooking_WhenSeatsAreWithinCapacity_CreatesConfirmedBooking()
        {
            // Arrange: Event capacity = 100, existing confirmed bookings = 60 seats, requested = 20 seats
            var (_, user1, user2, eventEntity) = await SeedBaseDataAsync(capacity: 100);

            using (var context = CreateContext())
            {
                // Seed 60 seats confirmed booking
                context.Bookings.Add(new Booking
                {
                    UserId = user2.Id,
                    EventId = eventEntity.Id,
                    NumberOfSeats = 60,
                    Status = BookingStatus.Confirmed,
                    BookingDate = DateTime.UtcNow.AddHours(-1)
                });
                await context.SaveChangesAsync();
            }

            // Act: User1 requests 20 seats
            using (var context = CreateContext())
            {
                var service = new BookingService(context);
                var dto = new CreateBookingDto
                {
                    EventId = eventEntity.Id,
                    NumberOfSeats = 20
                };

                var (booking, error, availableSeats) = await service.CreateBookingAsync(dto, user1.Id);

                // Assert
                Assert.NotNull(booking);
                Assert.Null(error);
                Assert.Null(availableSeats);
                Assert.Equal(BookingStatus.Confirmed.ToString(), booking.Status);
                Assert.Equal(20, booking.NumberOfSeats);
                Assert.Equal(eventEntity.Id, booking.EventId);
                Assert.Equal(user1.Id, booking.UserId);
            }

            // Verify persistence in database
            using (var context = CreateContext())
            {
                var totalConfirmedSeats = await context.Bookings
                    .Where(b => b.EventId == eventEntity.Id && b.Status == BookingStatus.Confirmed)
                    .SumAsync(b => b.NumberOfSeats);

                Assert.Equal(80, totalConfirmedSeats); // 60 + 20
            }
        }

        [Fact]
        public async Task CreateBooking_WhenSeatsExceedCapacity_RejectsBooking()
        {
            // Arrange: Event capacity = 100, existing confirmed bookings = 90 seats, requested = 11 seats
            var (_, user1, user2, eventEntity) = await SeedBaseDataAsync(capacity: 100);

            using (var context = CreateContext())
            {
                // Seed 90 seats confirmed booking
                context.Bookings.Add(new Booking
                {
                    UserId = user2.Id,
                    EventId = eventEntity.Id,
                    NumberOfSeats = 90,
                    Status = BookingStatus.Confirmed,
                    BookingDate = DateTime.UtcNow.AddHours(-1)
                });
                await context.SaveChangesAsync();
            }

            // Act: User1 requests 11 seats (available = 10)
            using (var context = CreateContext())
            {
                var service = new BookingService(context);
                var dto = new CreateBookingDto
                {
                    EventId = eventEntity.Id,
                    NumberOfSeats = 11
                };

                var (booking, error, availableSeats) = await service.CreateBookingAsync(dto, user1.Id);

                // Assert: Rejected (represents 409 Conflict)
                Assert.Null(booking);
                Assert.NotNull(error);
                Assert.Equal("Not enough seats available for this event.", error);
                Assert.Equal(10, availableSeats);
            }

            // Verify no additional booking was persisted
            using (var context = CreateContext())
            {
                var totalConfirmedSeats = await context.Bookings
                    .Where(b => b.EventId == eventEntity.Id && b.Status == BookingStatus.Confirmed)
                    .SumAsync(b => b.NumberOfSeats);

                Assert.Equal(90, totalConfirmedSeats);
            }
        }

        [Fact]
        public async Task CancelBooking_WhenBookingIsConfirmed_SetsStatusToCancelledAndFreesCapacity()
        {
            // Arrange: Event capacity = 100, initial booking of 20 seats
            var (_, user1, _, eventEntity) = await SeedBaseDataAsync(capacity: 100);

            int bookingId;
            using (var context = CreateContext())
            {
                var booking = new Booking
                {
                    UserId = user1.Id,
                    EventId = eventEntity.Id,
                    NumberOfSeats = 20,
                    Status = BookingStatus.Confirmed,
                    BookingDate = DateTime.UtcNow
                };
                context.Bookings.Add(booking);
                await context.SaveChangesAsync();
                bookingId = booking.Id;
            }

            // Act: Cancel the booking
            using (var context = CreateContext())
            {
                var service = new BookingService(context);
                var (found, alreadyCancelled, authorized, booking) =
                    await service.CancelBookingAsync(bookingId, user1.Id, isAdmin: false);

                // Assert status changed to Cancelled
                Assert.True(found);
                Assert.False(alreadyCancelled);
                Assert.True(authorized);
                Assert.NotNull(booking);
                Assert.Equal(BookingStatus.Cancelled.ToString(), booking.Status);
            }

            // Assert: Cancelled booking no longer contributes to capacity calculation
            using (var context = CreateContext())
            {
                var service = new BookingService(context);

                // With the 20-seat booking cancelled, a 100-seat booking should now succeed
                var fullCapacityDto = new CreateBookingDto
                {
                    EventId = eventEntity.Id,
                    NumberOfSeats = 100
                };

                var (newBooking, error, _) = await service.CreateBookingAsync(fullCapacityDto, user1.Id);

                Assert.NotNull(newBooking);
                Assert.Null(error);
                Assert.Equal(100, newBooking.NumberOfSeats);
            }
        }

        #endregion

        #region Additional Test Cases

        [Fact]
        public async Task CreateBooking_WhenEventDoesNotExist_ReturnsNotFoundResult()
        {
            // Arrange
            var (_, user1, _, _) = await SeedBaseDataAsync();

            using var context = CreateContext();
            var service = new BookingService(context);
            var dto = new CreateBookingDto
            {
                EventId = 9999, // Non-existent event ID
                NumberOfSeats = 2
            };

            // Act
            var (booking, error, availableSeats) = await service.CreateBookingAsync(dto, user1.Id);

            // Assert
            Assert.Null(booking);
            Assert.NotNull(error);
            Assert.Contains("not found", error, StringComparison.OrdinalIgnoreCase);
            Assert.Null(availableSeats);
        }

        [Fact]
        public async Task CancelBooking_WhenBookingDoesNotExist_ReturnsFoundFalse()
        {
            // Arrange
            var (_, user1, _, _) = await SeedBaseDataAsync();

            using var context = CreateContext();
            var service = new BookingService(context);

            // Act
            var (found, alreadyCancelled, authorized, booking) =
                await service.CancelBookingAsync(9999, user1.Id, isAdmin: false);

            // Assert
            Assert.False(found);
            Assert.False(alreadyCancelled);
            Assert.False(authorized);
            Assert.Null(booking);
        }

        [Fact]
        public async Task CancelBooking_WhenAlreadyCancelled_ReturnsAlreadyCancelledTrue()
        {
            // Arrange
            var (_, user1, _, eventEntity) = await SeedBaseDataAsync();

            int bookingId;
            using (var context = CreateContext())
            {
                var booking = new Booking
                {
                    UserId = user1.Id,
                    EventId = eventEntity.Id,
                    NumberOfSeats = 5,
                    Status = BookingStatus.Cancelled,
                    BookingDate = DateTime.UtcNow
                };
                context.Bookings.Add(booking);
                await context.SaveChangesAsync();
                bookingId = booking.Id;
            }

            // Act: Attempt to cancel again
            using (var context = CreateContext())
            {
                var service = new BookingService(context);
                var (found, alreadyCancelled, authorized, booking) =
                    await service.CancelBookingAsync(bookingId, user1.Id, isAdmin: false);

                // Assert
                Assert.True(found);
                Assert.True(alreadyCancelled);
                Assert.True(authorized);
                Assert.NotNull(booking);
                Assert.Equal(BookingStatus.Cancelled.ToString(), booking.Status);
            }
        }

        [Fact]
        public async Task CancelBooking_WhenUnauthorizedUserAttemptsCancellation_ReturnsAuthorizedFalse()
        {
            // Arrange: Booking belongs to user1
            var (_, user1, user2, eventEntity) = await SeedBaseDataAsync();

            int bookingId;
            using (var context = CreateContext())
            {
                var booking = new Booking
                {
                    UserId = user1.Id,
                    EventId = eventEntity.Id,
                    NumberOfSeats = 5,
                    Status = BookingStatus.Confirmed,
                    BookingDate = DateTime.UtcNow
                };
                context.Bookings.Add(booking);
                await context.SaveChangesAsync();
                bookingId = booking.Id;
            }

            // Act: User2 (non-owner, non-admin) attempts to cancel user1's booking
            using (var context = CreateContext())
            {
                var service = new BookingService(context);
                var (found, alreadyCancelled, authorized, booking) =
                    await service.CancelBookingAsync(bookingId, user2.Id, isAdmin: false);

                // Assert
                Assert.True(found);
                Assert.False(alreadyCancelled);
                Assert.False(authorized);
                Assert.Null(booking);
            }

            // Verify status remained Confirmed
            using (var context = CreateContext())
            {
                var persistentBooking = await context.Bookings.FindAsync(bookingId);
                Assert.NotNull(persistentBooking);
                Assert.Equal(BookingStatus.Confirmed, persistentBooking.Status);
            }
        }

        [Fact]
        public async Task CancelBooking_WhenAdminCancelsAnyUserBooking_ReturnsAuthorizedTrue()
        {
            // Arrange: Booking belongs to user1
            var (organizer, user1, _, eventEntity) = await SeedBaseDataAsync();

            int bookingId;
            using (var context = CreateContext())
            {
                var booking = new Booking
                {
                    UserId = user1.Id,
                    EventId = eventEntity.Id,
                    NumberOfSeats = 5,
                    Status = BookingStatus.Confirmed,
                    BookingDate = DateTime.UtcNow
                };
                context.Bookings.Add(booking);
                await context.SaveChangesAsync();
                bookingId = booking.Id;
            }

            // Act: Admin (organizer) cancels user1's booking
            using (var context = CreateContext())
            {
                var service = new BookingService(context);
                var (found, alreadyCancelled, authorized, booking) =
                    await service.CancelBookingAsync(bookingId, organizer.Id, isAdmin: true);

                // Assert
                Assert.True(found);
                Assert.False(alreadyCancelled);
                Assert.True(authorized);
                Assert.NotNull(booking);
                Assert.Equal(BookingStatus.Cancelled.ToString(), booking.Status);
            }
        }

        [Fact]
        public async Task GetMyBookings_ReturnsOnlyCurrentUserBookings()
        {
            // Arrange: Seed bookings for both user1 and user2
            var (_, user1, user2, eventEntity) = await SeedBaseDataAsync();

            using (var context = CreateContext())
            {
                context.Bookings.AddRange(
                    new Booking
                    {
                        UserId = user1.Id,
                        EventId = eventEntity.Id,
                        NumberOfSeats = 2,
                        Status = BookingStatus.Confirmed,
                        BookingDate = DateTime.UtcNow.AddMinutes(-10)
                    },
                    new Booking
                    {
                        UserId = user1.Id,
                        EventId = eventEntity.Id,
                        NumberOfSeats = 3,
                        Status = BookingStatus.Cancelled,
                        BookingDate = DateTime.UtcNow.AddMinutes(-5)
                    },
                    new Booking
                    {
                        UserId = user2.Id,
                        EventId = eventEntity.Id,
                        NumberOfSeats = 4,
                        Status = BookingStatus.Confirmed,
                        BookingDate = DateTime.UtcNow.AddMinutes(-1)
                    }
                );
                await context.SaveChangesAsync();
            }

            // Act
            using (var context = CreateContext())
            {
                var service = new BookingService(context);
                var user1Bookings = await service.GetMyBookingsAsync(user1.Id);

                // Assert: Returns only 2 bookings belonging to user1
                Assert.Equal(2, user1Bookings.Count);
                Assert.All(user1Bookings, b => Assert.Equal(user1.Id, b.UserId));
            }
        }

        [Fact]
        public async Task GetAllBookings_ReturnsAllBookingsChronologically()
        {
            // Arrange
            var (_, user1, user2, eventEntity) = await SeedBaseDataAsync();

            using (var context = CreateContext())
            {
                context.Bookings.AddRange(
                    new Booking
                    {
                        UserId = user1.Id,
                        EventId = eventEntity.Id,
                        NumberOfSeats = 2,
                        Status = BookingStatus.Confirmed,
                        BookingDate = DateTime.UtcNow.AddHours(-2)
                    },
                    new Booking
                    {
                        UserId = user2.Id,
                        EventId = eventEntity.Id,
                        NumberOfSeats = 4,
                        Status = BookingStatus.Confirmed,
                        BookingDate = DateTime.UtcNow.AddHours(-1)
                    }
                );
                await context.SaveChangesAsync();
            }

            // Act
            using (var context = CreateContext())
            {
                var service = new BookingService(context);
                var allBookings = await service.GetAllBookingsAsync();

                // Assert: Returns 2 bookings, ordered descending by BookingDate
                Assert.Equal(2, allBookings.Count);
                Assert.True(allBookings[0].BookingDate >= allBookings[1].BookingDate);
            }
        }

        #endregion
    }
}
