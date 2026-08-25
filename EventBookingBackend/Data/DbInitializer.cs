using EventBookingBackend.Models;
using EventBookingBackend.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EventBookingBackend.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(AppDbContext context)
        {
            // Apply pending migrations automatically on startup
            if (context.Database.IsRelational())
            {
                await context.Database.MigrateAsync();
            }

            // 1. Seed Default Admin User if not present
            var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@university.edu");
            if (adminUser == null)
            {
                // Check fallback admin email
                adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@test.com");
            }

            if (adminUser == null)
            {
                adminUser = new User
                {
                    Name = "Campus Event Admin",
                    Email = "admin@university.edu",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = Role.Admin
                };
                context.Users.Add(adminUser);
                await context.SaveChangesAsync();
            }

            // 2. Seed Default Student User if not present
            var studentUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "student@university.edu");
            if (studentUser == null)
            {
                studentUser = new User
                {
                    Name = "Alex Rivera",
                    Email = "student@university.edu",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    Role = Role.User
                };
                context.Users.Add(studentUser);
                await context.SaveChangesAsync();
            }

            // 3. Seed Realistic University Events if fewer than 5 exist
            var currentEventCount = await context.Events.CountAsync();
            if (currentEventCount < 5)
            {
                var demoEvents = new List<Event>
                {
                    new Event
                    {
                        Title = "Annual AI & Robotics Symposium 2027",
                        Description = "Explore the frontiers of Artificial Intelligence, autonomous robotics, and neural networks with keynote speakers from top tech institutions and industry pioneers.",
                        Venue = "Main Auditorium, Science & Tech Complex",
                        EventDate = DateTime.UtcNow.AddMonths(2).Date,
                        StartTime = new TimeSpan(9, 30, 0),
                        Capacity = 250,
                        Price = 15.00m,
                        CreatedById = adminUser.Id
                    },
                    new Event
                    {
                        Title = "University Spring Career & Internship Fair 2027",
                        Description = "Connect directly with over 60 premier technology, finance, and engineering employers hiring for summer internships and full-time graduate roles.",
                        Venue = "Campus Student Center - Grand Ballroom",
                        EventDate = DateTime.UtcNow.AddMonths(3).Date,
                        StartTime = new TimeSpan(10, 0, 0),
                        Capacity = 500,
                        Price = 0.00m,
                        CreatedById = adminUser.Id
                    },
                    new Event
                    {
                        Title = "Campus 48-Hour Hackathon 2027",
                        Description = "Form teams of up to 4 to build innovative software solutions tackling sustainability, education, and health. Mentorship, food, and $10k in prizes provided.",
                        Venue = "Engineering Hall - Innovation Labs",
                        EventDate = DateTime.UtcNow.AddMonths(4).Date,
                        StartTime = new TimeSpan(18, 0, 0),
                        Capacity = 120,
                        Price = 0.00m,
                        CreatedById = adminUser.Id
                    },
                    new Event
                    {
                        Title = "Cybersecurity & Cloud Defense Workshop",
                        Description = "A hands-on technical workshop covering cloud security architecture, ethical penetration testing, zero-trust infrastructure, and incident response.",
                        Venue = "Computer Lab 402, Technology Tower",
                        EventDate = DateTime.UtcNow.AddMonths(5).Date,
                        StartTime = new TimeSpan(13, 0, 0),
                        Capacity = 45,
                        Price = 20.00m,
                        CreatedById = adminUser.Id
                    },
                    new Event
                    {
                        Title = "Annual University Music & Cultural Festival",
                        Description = "A celebration of music, dance, and international cultures featuring student performances, live guest bands, food stalls, and art installations.",
                        Venue = "University Amphitheater & Open Grounds",
                        EventDate = DateTime.UtcNow.AddMonths(6).Date,
                        StartTime = new TimeSpan(17, 30, 0),
                        Capacity = 800,
                        Price = 30.00m,
                        CreatedById = adminUser.Id
                    }
                };

                foreach (var ev in demoEvents)
                {
                    // Only add if an event with the exact title does not already exist
                    var exists = await context.Events.AnyAsync(e => e.Title == ev.Title);
                    if (!exists)
                    {
                        context.Events.Add(ev);
                    }
                }

                await context.SaveChangesAsync();
            }
        }
    }
}
