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

        /* =====================================
           VARIABLES TEMPORALES RECUPERACIÓN
        ===================================== */
        static string codigoGlobal = "";
        static string correoGlobal = "";

        /* =====================================
           LOGIN
        ===================================== */
        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Datos inválidos.");

                var user =
                    await _context.Credenciales
                    .FirstOrDefaultAsync(x =>
                        x.Email == request.Email);

                if (user == null)
                    return BadRequest("Usuario no encontrado.");

                if (user.PasswordHash != request.Password)
                    return BadRequest("Contraseña incorrecta.");

                var usuario =
                    await _context.Usuarios
                    .FirstOrDefaultAsync(x =>
                        x.Id == user.UsuarioId);

                if (usuario == null)
                    return BadRequest("Usuario inválido.");

                return Ok(new
                {
                    usuarioId = usuario.Id,
                    nombre = usuario.Nombre,
                    rol = user.Rol ?? "Usuario"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.Message
                );
            }
        }

        /* =====================================
           REGISTRO
        ===================================== */
        [HttpPost("register")]
        public async Task<IActionResult> Register(
            [FromBody] RegisterRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Sin datos.");

                if (string.IsNullOrWhiteSpace(request.Nombre) ||
                    string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(
                        "Completa nombre, correo y contraseña."
                    );
                }

                bool existe =
                    await _context.Credenciales
                    .AnyAsync(x =>
                        x.Email == request.Email);

                if (existe)
                    return BadRequest(
                        "Correo ya registrado."
                    );

                /* CREAR USUARIO */
                var usuario =
                    new Usuario
                    {
                        Nombre = request.Nombre.Trim(),
                        Telefono =
                            request.Telefono ?? "",
                        Zona =
                            request.Zona ?? "",
                        Especialidad = "",
                        FechaRegistro =
                            DateTime.Now
                    };

                _context.Usuarios.Add(usuario);
                await _context.SaveChangesAsync();

                /* CREAR CREDENCIALES */
                var credencial =
                    new Credenciales
                    {
                        Email =
                            request.Email.Trim(),
                        PasswordHash =
                            request.Password.Trim(),
                        UsuarioId =
                            usuario.Id,
                        Rol = "Usuario"
                    };

                _context.Credenciales.Add(
                    credencial
                );

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    mensaje =
                        "Cuenta creada correctamente."
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

        /* =====================================
           ENVIAR CODIGO
        ===================================== */
        [HttpPost("enviar-codigo")]
        public async Task<IActionResult> EnviarCodigo(
            [FromBody] string email)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(email))
                    return BadRequest(
                        "Correo inválido."
                    );

                bool existe =
                    await _context.Credenciales
                    .AnyAsync(x =>
                        x.Email == email);

                if (!existe)
                    return BadRequest(
                        "Correo no encontrado."
                    );

                var rnd =
                    new Random();

                codigoGlobal =
                    rnd.Next(
                        100000,
                        999999
                    ).ToString();

                correoGlobal =
                    email;

                return Ok(
                    "Código generado: " +
                    codigoGlobal
                );
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.Message
                );
            }
        }

        /* =====================================
           RECUPERAR PASSWORD
        ===================================== */
        [HttpPost("recuperar")]
        public async Task<IActionResult> Recuperar(
            [FromBody] RecuperarRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest(
                        "Datos inválidos."
                    );

                if (request.Email != correoGlobal)
                    return BadRequest(
                        "Correo inválido."
                    );

                if (request.Codigo != codigoGlobal)
                    return BadRequest(
                        "Código incorrecto."
                    );

                var user =
                    await _context.Credenciales
                    .FirstOrDefaultAsync(x =>
                        x.Email ==
                        request.Email);

                if (user == null)
                    return BadRequest(
                        "Usuario no existe."
                    );

                user.PasswordHash =
                    request.NuevaPassword;

                await _context.SaveChangesAsync();

                codigoGlobal = "";
                correoGlobal = "";

                return Ok(
                    "Contraseña actualizada."
                );
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.Message
                );
            }
        }
    }

    /* =====================================
       REQUEST RECUPERAR
    ===================================== */
    public class RecuperarRequest
    {
        public string Email { get; set; }
        public string Codigo { get; set; }
        public string NuevaPassword { get; set; }
    }
}