using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EventBookingBackend.Data;
using EventBookingBackend.DTOs;
using EventBookingBackend.Models;
using EventBookingBackend.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace EventBookingBackend.Services
{
    public class AuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<(AuthResponseDto? Response, string? Error)> RegisterAsync(RegisterDto dto)
        {
            var emailLower = dto.Email.Trim().ToLower();
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
            if (existingUser != null)
            {
                return (null, "A user with this email already exists.");
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            var user = new User
            {
                Name = dto.Name.Trim(),
                Email = dto.Email.Trim(),
                PasswordHash = passwordHash,
                Role = Role.User
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return (new AuthResponseDto
            {
                Token = token,
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.ToString()
            }, null);
        }

        public async Task<(AuthResponseDto? Response, string? Error)> LoginAsync(LoginDto dto)
        {
            var emailLower = dto.Email.Trim().ToLower();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
            if (user == null)
            {
                return (null, "Invalid email or password.");
            }

            bool isPasswordValid = false;
            try
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            }
            catch
            {
                isPasswordValid = false;
            }

            if (!isPasswordValid)
            {
                return (null, "Invalid email or password.");
            }

            var token = GenerateJwtToken(user);
            return (new AuthResponseDto
            {
                Token = token,
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.ToString()
            }, null);
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key is not configured.");
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            var expiryMinutes = int.TryParse(jwtSettings["ExpiryInMinutes"], out int exp) ? exp : 60;

            var keyBytes = Encoding.UTF8.GetBytes(key);
            var securityKey = new SymmetricSecurityKey(keyBytes);
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
