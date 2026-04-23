using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // REGISTRO
        // =====================================================
        [HttpPost("register")]
        public async Task<IActionResult> Register(
            [FromBody] RegisterRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("No se recibieron datos.");

                if (string.IsNullOrWhiteSpace(request.Nombre) ||
                    string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest("Nombre, correo y contraseña son obligatorios.");
                }

                request.Telefono ??= "";
                request.Zona ??= "";

                bool existe = await _context.Credenciales
                    .AnyAsync(x => x.Email == request.Email);

                if (existe)
                    return BadRequest("El correo ya existe.");

                // =====================================
                // CREAR USUARIO
                // =====================================
                var usuario = new Usuario
                {
                    Nombre = request.Nombre,
                    Telefono = request.Telefono,
                    Zona = request.Zona,
                    Especialidad = "",
                    FechaRegistro = DateTime.UtcNow
                };

                _context.Usuarios.Add(usuario);
                await _context.SaveChangesAsync();

                // =====================================
                // CREAR CREDENCIALES
                // =====================================
                var credenciales = new Credenciales
                {
                    Email = request.Email,
                    PasswordHash = request.Password,
                    UsuarioId = usuario.Id,
                    Rol = "Usuario"
                };

                _context.Credenciales.Add(credenciales);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    mensaje = "Cuenta creada correctamente"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.InnerException?.Message ??
                    ex.Message
                );
            }
        }

        // =====================================================
        // LOGIN
        // =====================================================
        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequest request)
        {
            try
            {
                var credenciales =
                    await _context.Credenciales
                    .FirstOrDefaultAsync(x =>
                        x.Email == request.Email);

                if (credenciales == null)
                    return BadRequest("Usuario no encontrado.");

                if (credenciales.PasswordHash != request.Password)
                    return BadRequest("Contraseña incorrecta.");

                var usuario =
                    await _context.Usuarios
                    .FirstOrDefaultAsync(x =>
                        x.Id == credenciales.UsuarioId);

                if (usuario == null)
                    return BadRequest("Usuario inválido.");

                return Ok(new
                {
                    usuarioId = usuario.Id,
                    nombre = usuario.Nombre,
                    rol = credenciales.Rol
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.InnerException?.Message ??
                    ex.Message
                );
            }
        }
    }
}