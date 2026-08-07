using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SetupController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly PasswordHasher<Credenciales> _passwordHasher = new();

        public SetupController(
            AppDbContext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("admin")]
        public async Task<IActionResult> CrearPrimerAdmin(
            [FromBody] SetupAdminRequest request)
        {
            var setupKey =
                Environment.GetEnvironmentVariable("MINDCARE_SETUP_KEY");

            if (string.IsNullOrWhiteSpace(setupKey))
            {
                setupKey =
                    _configuration["Setup:Key"];
            }

            if (string.IsNullOrWhiteSpace(setupKey))
                return BadRequest(
                    "Configura MINDCARE_SETUP_KEY antes de crear el administrador.");

            if (request == null ||
                request.SetupKey != setupKey)
                return Unauthorized("Clave de instalación inválida.");

            if (string.IsNullOrWhiteSpace(request.Nombre) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(
                    "Completa nombre, correo y contraseña.");

            if (request.Password.Length < 8)
                return BadRequest(
                    "La contraseña del administrador debe tener mínimo 8 caracteres.");

            var email = request.Email.Trim().ToLowerInvariant();

            var credencial =
                await _context.Credenciales
                .FirstOrDefaultAsync(x =>
                    x.Email.ToLower() == email);

            if (credencial != null)
            {
                credencial.Rol = "Admin";
                credencial.Activo = true;
                credencial.PasswordHash =
                    _passwordHasher.HashPassword(
                        credencial,
                        request.Password);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    mensaje = "Usuario existente promovido a administrador.",
                    usuarioId = credencial.UsuarioId
                });
            }

            var usuario =
                new Usuario
                {
                    Nombre = request.Nombre.Trim(),
                    Telefono = "",
                    Zona = "",
                    Especialidad = "Administración",
                    FechaRegistro = DateTime.UtcNow
                };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            credencial =
                new Credenciales
                {
                    Email = email,
                    UsuarioId = usuario.Id,
                    Rol = "Admin",
                    Activo = true
                };

            credencial.PasswordHash =
                _passwordHasher.HashPassword(
                    credencial,
                    request.Password);

            _context.Credenciales.Add(credencial);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Administrador creado correctamente.",
                usuarioId = usuario.Id
            });
        }
    }
}
