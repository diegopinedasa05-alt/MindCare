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

        static string codigoGlobal = "";
        static string correoGlobal = "";

        // LOGIN
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Credenciales
                .FirstOrDefaultAsync(x => x.Email == request.Email);

            if (user == null)
                return BadRequest("Usuario no encontrado.");

            if (user.PasswordHash != request.Password)
                return BadRequest("Contraseña incorrecta.");

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(x => x.Id == user.UsuarioId);

            return Ok(new
            {
                usuarioId = usuario.Id,
                nombre = usuario.Nombre
            });
        }

        // REGISTRO
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var existe = await _context.Credenciales
                .AnyAsync(x => x.Email == request.Email);

            if (existe)
                return BadRequest("Correo ya registrado.");

            var usuario = new Usuario
            {
                Nombre = request.Nombre,
                FechaRegistro = DateTime.UtcNow
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            _context.Credenciales.Add(new Credenciales
            {
                Email = request.Email,
                PasswordHash = request.Password,
                UsuarioId = usuario.Id,
                Rol = "Usuario"
            });

            await _context.SaveChangesAsync();

            return Ok("Cuenta creada.");
        }

        // =====================================
        // ENVIAR CODIGO
        // =====================================
        [HttpPost("enviar-codigo")]
        public async Task<IActionResult> EnviarCodigo([FromBody] string email)
        {
            var existe = await _context.Credenciales
                .AnyAsync(x => x.Email == email);

            if (!existe)
                return BadRequest("Correo no encontrado.");

            var rnd = new Random();
            codigoGlobal = rnd.Next(100000, 999999).ToString();
            correoGlobal = email;

            // DEMO RAPIDA
            return Ok("Código generado: " + codigoGlobal);
        }

        // =====================================
        // RECUPERAR
        // =====================================
        [HttpPost("recuperar")]
        public async Task<IActionResult> Recuperar([FromBody] RecuperarRequest request)
        {
            if (request.Email != correoGlobal)
                return BadRequest("Correo inválido.");

            if (request.Codigo != codigoGlobal)
                return BadRequest("Código incorrecto.");

            var user = await _context.Credenciales
                .FirstOrDefaultAsync(x => x.Email == request.Email);

            if (user == null)
                return BadRequest("Usuario no existe.");

            user.PasswordHash = request.NuevaPassword;

            await _context.SaveChangesAsync();

            codigoGlobal = "";
            correoGlobal = "";

            return Ok("Contraseña actualizada.");
        }
    }

    public class RecuperarRequest
    {
        public string Email { get; set; }
        public string Codigo { get; set; }
        public string NuevaPassword { get; set; }
    }
}