using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using AppTesisAPI.Data;
using AppTesisAPI.Models;
using AppTesisAPI.Services;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.RateLimiting;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly TokenService _tokenService;
        private readonly IWebHostEnvironment _environment;
        private readonly PasswordHasher<Credenciales> _passwordHasher = new();

        public AuthController(
            AppDbContext context,
            TokenService tokenService,
            IWebHostEnvironment environment)
        {
            _context = context;
            _tokenService = tokenService;
            _environment = environment;
        }

        [HttpPost("login")]
        [EnableRateLimiting("auth-login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Datos inválidos.");

                if (string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password))
                    return BadRequest("Completa correo y contraseña.");

                var email = request.Email.Trim().ToLowerInvariant();

                var credencial =
                    await _context.Credenciales
                    .FirstOrDefaultAsync(x =>
                        x.Email.ToLower() == email);

                if (credencial == null)
                {
                    RegistrarAuditoria(
                        null,
                        "InicioSesion",
                        "Credenciales",
                        "",
                        "Fallido");
                    await _context.SaveChangesAsync();
                    return BadRequest("Credenciales inválidas.");
                }

                if (!credencial.Activo)
                {
                    RegistrarAuditoria(
                        credencial.UsuarioId,
                        "InicioSesion",
                        "Credenciales",
                        credencial.UsuarioId.ToString(),
                        "Fallido");
                    await _context.SaveChangesAsync();
                    return BadRequest("Credenciales inválidas.");
                }

                if (!VerificarPassword(credencial, request.Password))
                {
                    RegistrarAuditoria(
                        credencial.UsuarioId,
                        "InicioSesion",
                        "Credenciales",
                        credencial.UsuarioId.ToString(),
                        "Fallido");
                    await _context.SaveChangesAsync();
                    return BadRequest("Credenciales inválidas.");
                }

                var usuario =
                    await _context.Usuarios
                    .FirstOrDefaultAsync(x =>
                        x.Id == credencial.UsuarioId);

                if (usuario == null)
                    return BadRequest("Usuario inválido.");

                var rol = credencial.Rol ?? "Usuario";
                var token = _tokenService.CrearToken(usuario, rol);

                _context.AuditoriaAccesos.Add(new AuditoriaAcceso
                {
                    UsuarioId = usuario.Id,
                    Fecha = DateTime.UtcNow,
                    Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? ""
                });
                RegistrarAuditoria(
                    usuario.Id,
                    "InicioSesion",
                    "Credenciales",
                    usuario.Id.ToString(),
                    "Exitoso");
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    usuarioId = usuario.Id,
                    nombre = usuario.Nombre,
                    rol,
                    token
                });
            }
            catch (Exception ex)
            {
                return ErrorSeguro(ex);
            }
        }

        [HttpPost("register")]
        [EnableRateLimiting("auth-register")]
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
                        "Completa nombre, correo y contraseña.");
                }

                if (!EsCorreoValido(request.Email))
                    return BadRequest("Correo inválido.");

                if (request.Nombre.Trim().Length > 120 ||
                    request.Telefono.Trim().Length > 30 ||
                    request.Zona.Trim().Length > 100)
                    return BadRequest("Uno o más campos exceden la longitud permitida.");

                if (request.Password.Length < 10)
                    return BadRequest(
                        "La contraseña debe tener mínimo 10 caracteres.");

                if (!request.AceptaTerminos)
                    return BadRequest(
                        "Debes aceptar los términos y el consentimiento informado.");

                var email = request.Email.Trim().ToLowerInvariant();

                var existe =
                    await _context.Credenciales
                    .AnyAsync(x =>
                        x.Email.ToLower() == email);

                if (existe)
                    return BadRequest("Correo ya registrado.");

                var usuario =
                    new Usuario
                    {
                        Nombre = request.Nombre.Trim(),
                        Telefono = request.Telefono ?? "",
                        Zona = request.Zona ?? "",
                        Especialidad = "",
                        FechaRegistro = DateTime.UtcNow
                    };

                _context.Usuarios.Add(usuario);
                await _context.SaveChangesAsync();

                var credencial =
                    new Credenciales
                    {
                        Email = email,
                        UsuarioId = usuario.Id,
                        Rol = "Usuario",
                        Activo = true
                    };

                credencial.PasswordHash =
                    _passwordHasher.HashPassword(
                        credencial,
                        request.Password.Trim());

                _context.Credenciales.Add(credencial);

                _context.ConsentimientosUsuario.Add(
                    new ConsentimientoUsuario
                    {
                        UsuarioId = usuario.Id,
                        VersionDocumento = "MindCare-legal-v1",
                        FechaAceptacion = DateTime.UtcNow,
                        Ip =
                            HttpContext.Connection.RemoteIpAddress?
                            .ToString() ?? "",
                        UserAgent =
                            Request.Headers.UserAgent.ToString()
                    });

                RegistrarAuditoria(
                    usuario.Id,
                    "RegistroUsuario",
                    "Usuario",
                    usuario.Id.ToString(),
                    "Exitoso");

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    mensaje = "Cuenta creada correctamente."
                });
            }
            catch (Exception ex)
            {
                return ErrorSeguro(ex);
            }
        }

        [HttpPost("enviar-codigo")]
        [EnableRateLimiting("auth-recovery")]
        public async Task<IActionResult> EnviarCodigo(
            [FromBody] string email)
        {
            try
            {
                if (!EsCorreoValido(email))
                    return BadRequest("Correo inválido.");

                var correo = email.Trim().ToLowerInvariant();

                var existe =
                    await _context.Credenciales
                    .AnyAsync(x =>
                        x.Email.ToLower() == correo);

                string? codigo = null;

                if (existe)
                {
                    var anteriores =
                        await _context.RecuperacionPasswords
                        .Where(x => x.Email.ToLower() == correo)
                        .ToListAsync();

                    _context.RecuperacionPasswords.RemoveRange(anteriores);

                    codigo = RandomNumberGenerator
                        .GetInt32(100000, 1000000)
                        .ToString();

                    _context.RecuperacionPasswords.Add(
                        new RecuperacionPassword
                        {
                            Email = correo,
                            Codigo = HashRecoveryCode(codigo),
                            FechaExpiracion = DateTime.UtcNow.AddMinutes(15)
                        });

                    await _context.SaveChangesAsync();
                }

                var respuesta = new
                {
                    mensaje =
                        "Si el correo está registrado, se generó un código de recuperación con vigencia de 15 minutos.",
                    codigoDemo =
                        _environment.IsDevelopment() && codigo != null
                            ? codigo
                            : null
                };

                return Ok(respuesta);
            }
            catch (Exception ex)
            {
                return ErrorSeguro(ex);
            }
        }

        [HttpPost("recuperar")]
        [EnableRateLimiting("auth-recovery")]
        public async Task<IActionResult> Recuperar(
            [FromBody] RecuperarRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Datos inválidos.");

                if (string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Codigo) ||
                    string.IsNullOrWhiteSpace(request.NuevaPassword))
                    return BadRequest(
                        "Completa correo, código y nueva contraseña.");

                if (request.NuevaPassword.Length < 10)
                    return BadRequest(
                        "La contraseña debe tener mínimo 10 caracteres.");

                var correo =
                    request.Email.Trim().ToLowerInvariant();

                var recuperaciones =
                    await _context.RecuperacionPasswords
                    .Where(x =>
                        x.Email.ToLower() == correo &&
                        x.FechaExpiracion >= DateTime.UtcNow)
                    .OrderByDescending(x =>
                        x.FechaExpiracion)
                    .ToListAsync();

                var recuperacion = recuperaciones.FirstOrDefault(x =>
                    VerificarRecoveryCode(x.Codigo, request.Codigo.Trim()));

                if (recuperacion == null)
                    return BadRequest("Código inválido o expirado.");

                var credencial =
                    await _context.Credenciales
                    .FirstOrDefaultAsync(x =>
                        x.Email.ToLower() == correo);

                if (credencial == null)
                    return BadRequest("Usuario no existe.");

                credencial.PasswordHash =
                    _passwordHasher.HashPassword(
                        credencial,
                        request.NuevaPassword);

                var codigos =
                    await _context.RecuperacionPasswords
                    .Where(x =>
                        x.Email.ToLower() == correo)
                    .ToListAsync();

                _context.RecuperacionPasswords
                    .RemoveRange(codigos);

                RegistrarAuditoria(
                    credencial.UsuarioId,
                    "CambioPassword",
                    "Credenciales",
                    credencial.UsuarioId.ToString(),
                    "Exitoso");

                await _context.SaveChangesAsync();

                return Ok("Contraseña actualizada.");
            }
            catch (Exception ex)
            {
                return ErrorSeguro(ex);
            }
        }

        private void RegistrarAuditoria(
            int? usuarioId,
            string accion,
            string entidad,
            string entidadId,
            string resultado)
        {
            _context.AuditoriaEventos.Add(new AuditoriaEvento
            {
                UsuarioId = usuarioId,
                Accion = accion,
                Entidad = entidad,
                EntidadId = entidadId,
                FechaUtc = DateTime.UtcNow,
                Resultado = resultado,
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "",
                CorrelationId = HttpContext.TraceIdentifier,
                Detalles = ""
            });
        }

        private IActionResult ErrorSeguro(Exception ex)
        {
            var mensaje =
                ex.InnerException?.Message ?? ex.Message;

            if (mensaje.Contains(
                "ConnectionString property has not been initialized",
                StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(503, new
                {
                    codigo = "CONFIGURACION_BD_REQUERIDA",
                    mensaje =
                        "La conexion a PostgreSQL no esta configurada. Define ConnectionStrings__DefaultConnection antes de iniciar MindCare."
                });
            }

            if (mensaje.Contains(
                "No password has been provided",
                StringComparison.OrdinalIgnoreCase) ||
                mensaje.Contains(
                "password authentication failed",
                StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(503, new
                {
                    codigo = "BD_CREDENCIALES_INVALIDAS",
                    mensaje =
                        "No se pudo conectar a PostgreSQL. Verifica host, usuario, contrasena y SSL."
                });
            }

            return StatusCode(StatusCodes.Status400BadRequest, new
            {
                codigo = "SOLICITUD_INVALIDA",
                mensaje = "No se pudo completar la solicitud."
            });
        }

        private static bool EsCorreoValido(string? email)
        {
            if (string.IsNullOrWhiteSpace(email) || email.Length > 254)
                return false;

            try
            {
                var parsed = new System.Net.Mail.MailAddress(email.Trim());
                return parsed.Address.Equals(
                    email.Trim(),
                    StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        private static string HashRecoveryCode(string code)
        {
            return Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes(code)));
        }

        private static bool VerificarRecoveryCode(
            string storedCode,
            string receivedCode)
        {
            // Allows recovery codes issued before this security update to expire naturally.
            if (storedCode.Length == 6 && storedCode.All(char.IsDigit))
            {
                return CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(storedCode),
                    Encoding.UTF8.GetBytes(receivedCode));
            }

            var receivedHash = HashRecoveryCode(receivedCode);
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(storedCode),
                Encoding.UTF8.GetBytes(receivedHash));
        }

        private bool VerificarPassword(
            Credenciales credencial,
            string password)
        {
            if (credencial.PasswordHash.StartsWith("AQAAAA"))
            {
                var resultado =
                    _passwordHasher.VerifyHashedPassword(
                        credencial,
                        credencial.PasswordHash,
                        password);

                return resultado !=
                    PasswordVerificationResult.Failed;
            }

            if (credencial.PasswordHash == password)
            {
                credencial.PasswordHash =
                    _passwordHasher.HashPassword(
                        credencial,
                        password);

                _context.SaveChanges();
                return true;
            }

            return false;
        }
    }
}
