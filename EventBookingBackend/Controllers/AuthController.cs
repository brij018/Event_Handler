using EventBookingBackend.DTOs;
using EventBookingBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventBookingBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (response, error) = await _authService.RegisterAsync(dto);
            if (error != null)
                return Conflict(new { message = error });

            return StatusCode(201, response);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (response, error) = await _authService.LoginAsync(dto);
            if (error != null)
                return Unauthorized(new { message = error });

            return Ok(response);
        }
    }
}
