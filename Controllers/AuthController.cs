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
                    return BadRequest(
                        "No se recibieron datos.");

                if (string.IsNullOrWhiteSpace(request.Nombre) ||
                    string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(
                        "Nombre, correo y contraseña son obligatorios.");
                }

                request.Telefono ??= "";
                request.Zona ??= "";

                // =====================================
                // VALIDAR CORREO DUPLICADO
                // =====================================
                bool existe =
                    await _context.Credenciales
                    .AnyAsync(x =>
                        x.Email == request.Email);

                if (existe)
                    return BadRequest(
                        "El correo ya existe.");

                // =====================================
                // CREAR USUARIO
                // =====================================
                var usuario = new Usuario
                {
                    Nombre = request.Nombre,
                    Telefono = request.Telefono,
                    Zona = request.Zona,
                    Especialidad = ""
                };

                _context.Usuarios.Add(usuario);

                await _context.SaveChangesAsync();

                // =====================================
                // CREDENCIALES
                // =====================================
                var credenciales =
                    new Credenciales
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
                    mensaje =
                    "Cuenta creada correctamente"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    "Error: " + ex.Message);
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
                if (request == null ||
                    string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest("Datos inválidos.");
                }

                /* ===============================
                   BUSCAR CREDENCIALES
                =============================== */
                var credenciales =
                    await _context.Credenciales
                    .FirstOrDefaultAsync(x =>
                        x.Email == request.Email);

                if (credenciales == null)
                    return BadRequest(
                        "Usuario no encontrado.");

                if (credenciales.PasswordHash !=
                    request.Password)
                {
                    return BadRequest(
                        "Contraseña incorrecta.");
                }

                /* ===============================
                   BUSCAR USUARIO REAL
                =============================== */
                var usuario =
                    await _context.Usuarios
                    .FirstOrDefaultAsync(x =>
                        x.Id ==
                        credenciales.UsuarioId);

                if (usuario == null)
                    return BadRequest(
                        "Usuario inválido.");

                /* ===============================
                   AUTO CREAR PSICÓLOGO
                =============================== */
                if (credenciales.Rol
                    .Trim()
                    .ToLower() == "psicologo")
                {
                    bool existe =
                        await _context.Psicologos
                        .AnyAsync(p =>
                            p.Nombre ==
                            usuario.Nombre &&
                            p.Telefono ==
                            usuario.Telefono);

                    if (!existe)
                    {
                        var nuevo =
                            new Psicologo
                            {
                                Nombre =
                                    usuario.Nombre,

                                Especialidad =
                                    usuario.Especialidad
                                    ?? "",

                                Zona =
                                    usuario.Zona
                                    ?? "",

                                Telefono =
                                    usuario.Telefono
                                    ?? ""
                            };

                        _context.Psicologos
                            .Add(nuevo);

                        await _context
                            .SaveChangesAsync();
                    }
                }

                /* ===============================
                   AUDITORÍA
                =============================== */
                var auditoria =
                    new AuditoriaAcceso
                    {
                        UsuarioId =
                            usuario.Id,

                        Fecha =
                            DateTime.Now,

                        Ip =
                            HttpContext
                            .Connection
                            .RemoteIpAddress?
                            .ToString()
                    };

                _context
                    .AuditoriaAccesos
                    .Add(auditoria);

                await _context
                    .SaveChangesAsync();

                /* ===============================
                   RESPUESTA LOGIN
                =============================== */
                return Ok(new
                {
                    usuarioId =
                        usuario.Id,

                    rol =
                        credenciales.Rol,

                    nombre =
                        usuario.Nombre
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    "Error: " + ex.Message);
            }
        }

        // =====================================================
        // ENVIAR CÓDIGO
        // =====================================================
        [HttpPost("enviar-codigo")]
        public async Task<IActionResult>
            EnviarCodigo(
            [FromBody] string email)
        {
            if (string.IsNullOrWhiteSpace(
                email))
            {
                return BadRequest(
                    "Correo requerido.");
            }

            var existe =
                await _context.Credenciales
                .AnyAsync(x =>
                    x.Email == email);

            if (!existe)
                return BadRequest(
                    "Correo no encontrado.");

            string codigo =
                new Random()
                .Next(100000, 999999)
                .ToString();

            var anteriores =
                _context
                .RecuperacionPasswords
                .Where(x =>
                    x.Email == email);

            _context
                .RecuperacionPasswords
                .RemoveRange(
                    anteriores);

            var rec =
                new RecuperacionPassword
                {
                    Email = email,
                    Codigo = codigo,
                    FechaExpiracion =
                        DateTime.Now
                        .AddMinutes(10)
                };

            _context
                .RecuperacionPasswords
                .Add(rec);

            await _context
                .SaveChangesAsync();

            return Ok(new
            {
                codigo = codigo
            });
        }

        // =====================================================
        // RECUPERAR PASSWORD
        // =====================================================
        [HttpPost("recuperar")]
        public async Task<IActionResult>
            RecuperarPassword(
            [FromBody]
            RecuperarRequest model)
        {
            if (model == null)
                return BadRequest(
                    "Datos inválidos.");

            var rec =
                await _context
                .RecuperacionPasswords
                .FirstOrDefaultAsync(x =>
                    x.Email ==
                    model.Email &&
                    x.Codigo ==
                    model.Codigo);

            if (rec == null)
                return BadRequest(
                    "Código inválido.");

            if (rec.FechaExpiracion <
                DateTime.Now)
            {
                return BadRequest(
                    "Código expirado.");
            }

            var credenciales =
                await _context
                .Credenciales
                .FirstOrDefaultAsync(x =>
                    x.Email ==
                    model.Email);

            if (credenciales == null)
                return BadRequest(
                    "Usuario no existe.");

            credenciales.PasswordHash =
                model.NuevaPassword;

            _context
                .RecuperacionPasswords
                .Remove(rec);

            await _context
                .SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Contraseña actualizada correctamente"
            });
        }
    }
}