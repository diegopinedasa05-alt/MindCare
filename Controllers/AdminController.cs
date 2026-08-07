using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;
using AppTesisAPI.Services;

namespace AppTesisAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly PasswordHasher<Credenciales> _passwordHasher = new();

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("resumen")]
        public async Task<IActionResult> Resumen()
        {
            var totalPsicologos =
                await _context.Usuarios
                .Join(
                    _context.Credenciales,
                    u => u.Id,
                    c => c.UsuarioId,
                    (u, c) => new { u, c })
                .Where(x => x.c.Rol == "Psicologo")
                .CountAsync();

            return Ok(new
            {
                usuarios = await _context.Usuarios.CountAsync(),
                psicologos = totalPsicologos,
                citas = await _context.Citas.CountAsync(),
                tests =
                    await _context.TestPHQ9.CountAsync() +
                    await _context.TestEstresLaboral.CountAsync(),
                registros =
                    await _context.RegistrosEmocionales.CountAsync(),
                riesgoAlto =
                    await _context.HistorialPredictivo
                    .Where(x =>
                        x.NivelRiesgo == "Alto" ||
                        x.NivelRiesgo == "Severo" ||
                        x.NivelRiesgo == "Critico" ||
                        x.NivelRiesgo == "Crítico" ||
                        x.NivelRiesgo == "Estrés alto" ||
                        x.NivelRiesgo == "Estrés grave")
                    .CountAsync()
            });
        }

        [HttpGet("usuarios-recientes")]
        public async Task<IActionResult> UsuariosRecientes()
        {
            var lista =
                await _context.Usuarios
                .OrderByDescending(x => x.FechaRegistro)
                .Take(10)
                .Select(x => new
                {
                    id = x.Id,
                    nombre = x.Nombre,
                    fecha = x.FechaRegistro,
                    zona = x.Zona
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpGet("usuarios")]
        public async Task<IActionResult> Usuarios()
        {
            var lista =
                await _context.Usuarios
                .Join(
                    _context.Credenciales,
                    u => u.Id,
                    c => c.UsuarioId,
                    (u, c) => new { u, c })
                .OrderByDescending(x => x.u.FechaRegistro)
                .Select(x => new
                {
                    id = x.u.Id,
                    nombre = x.u.Nombre,
                    email = x.c.Email,
                    rol = x.c.Rol,
                    activo = x.c.Activo,
                    telefono = x.u.Telefono,
                    zona = x.u.Zona,
                    especialidad = x.u.Especialidad,
                    fechaRegistro = x.u.FechaRegistro,
                    registros =
                        _context.RegistrosEmocionales
                        .Count(r => r.UsuarioId == x.u.Id),
                    phq9 =
                        _context.TestPHQ9
                        .Count(t => t.UsuarioId == x.u.Id),
                    estres =
                        _context.TestEstresLaboral
                        .Count(t => t.UsuarioId == x.u.Id),
                    alertas =
                        _context.HistorialPredictivo
                        .Count(h =>
                            h.UsuarioId == x.u.Id &&
                            (h.NivelRiesgo == "Alto" ||
                             h.NivelRiesgo == "Severo" ||
                             h.NivelRiesgo == "Critico" ||
                             h.NivelRiesgo == "Crítico" ||
                             h.NivelRiesgo == "Estrés alto" ||
                             h.NivelRiesgo == "Estrés grave"))
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPatch("usuarios/{usuarioId}/estado")]
        public async Task<IActionResult> CambiarEstadoUsuario(
            int usuarioId,
            [FromBody] CambiarEstadoUsuarioRequest request)
        {
            var credencial =
                await _context.Credenciales
                .FirstOrDefaultAsync(x =>
                    x.UsuarioId == usuarioId);

            if (credencial == null)
                return NotFound("Usuario no encontrado");

            var adminId =
                User.GetUserId();

            if (adminId == usuarioId && !request.Activo)
                return BadRequest(
                    "No puedes desactivar tu propia cuenta administradora.");

            credencial.Activo = request.Activo;

            if (string.Equals(credencial.Rol, "Psicologo", StringComparison.OrdinalIgnoreCase))
            {
                var perfil = await _context.PerfilesPsicologo
                    .FirstOrDefaultAsync(x => x.UsuarioId == usuarioId);

                if (perfil != null)
                    perfil.Activo = request.Activo;
            }

            RegistrarAuditoria(
                adminId,
                request.Activo ? "ActivarCuenta" : "DesactivarCuenta",
                "Usuario",
                usuarioId.ToString(),
                "Correcto");

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    request.Activo
                        ? "Usuario activado correctamente."
                        : "Usuario desactivado correctamente.",
                usuarioId,
                activo = request.Activo
            });
        }

        [HttpGet("psicologos")]
        public async Task<IActionResult> Psicologos()
        {
            var lista =
                await _context.Usuarios
                .Join(
                    _context.Credenciales,
                    u => u.Id,
                    c => c.UsuarioId,
                    (u, c) => new { u, c })
                .Where(x => x.c.Rol == "Psicologo")
                .Select(x => new
                {
                    id = x.u.Id,
                    nombre = x.u.Nombre,
                    zona = x.u.Zona,
                    especialidad = x.u.Especialidad,
                    activo = x.c.Activo
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpGet("citas-proximas")]
        public async Task<IActionResult> CitasProximas()
        {
            var ahora = DateTime.UtcNow;

            var lista =
                await _context.Citas
                .Where(x =>
                    x.Fecha >= ahora &&
                    x.Estado != "Cancelada")
                .OrderBy(x => x.Fecha)
                .Take(10)
                .Select(x => new
                {
                    x.Id,
                    x.Fecha,
                    x.Estado,
                    paciente =
                        _context.Usuarios
                        .Where(u => u.Id == x.UsuarioId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault(),
                    psicologo =
                        _context.Usuarios
                        .Where(u => u.Id == x.PsicologoId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpGet("alertas-recientes")]
        public async Task<IActionResult> AlertasRecientes()
        {
            var lista =
                await _context.HistorialPredictivo
                .OrderByDescending(x => x.Fecha)
                .Take(12)
                .Select(x => new
                {
                    x.Id,
                    x.UsuarioId,
                    paciente =
                        _context.Usuarios
                        .Where(u => u.Id == x.UsuarioId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault(),
                    x.NivelRiesgo,
                    x.Origen,
                    x.Fecha
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpGet("consentimientos-recientes")]
        public async Task<IActionResult> ConsentimientosRecientes()
        {
            var lista =
                await _context.ConsentimientosUsuario
                .OrderByDescending(x => x.FechaAceptacion)
                .Take(10)
                .Select(x => new
                {
                    x.Id,
                    x.UsuarioId,
                    usuario =
                        _context.Usuarios
                        .Where(u => u.Id == x.UsuarioId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault(),
                    x.VersionDocumento,
                    x.FechaAceptacion
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPost("registrar-psicologo")]
        public async Task<IActionResult> RegistrarPsicologo(
            [FromBody] RegisterRequest model)
        {
            try
            {
                if (model == null ||
                    string.IsNullOrWhiteSpace(model.Nombre) ||
                    string.IsNullOrWhiteSpace(model.Email) ||
                    string.IsNullOrWhiteSpace(model.Password))
                {
                    return BadRequest("Completa campos obligatorios");
                }

                if (model.Password.Length < 10)
                    return BadRequest(
                        "La contraseña debe tener mínimo 10 caracteres.");

                var email = model.Email.Trim().ToLowerInvariant();

                var existe =
                    await _context.Credenciales
                    .AnyAsync(x =>
                        x.Email.ToLower() == email);

                if (existe)
                    return BadRequest("Correo ya registrado");

                var usuario =
                    new Usuario
                    {
                        Nombre = model.Nombre.Trim(),
                        Telefono = model.Telefono ?? "",
                        Zona = model.Zona ?? "",
                        Especialidad = model.Especialidad ?? "",
                        FechaRegistro = DateTime.UtcNow
                    };

                _context.Usuarios.Add(usuario);
                await _context.SaveChangesAsync();

                var credencial =
                    new Credenciales
                    {
                        Email = email,
                        UsuarioId = usuario.Id,
                        Rol = "Psicologo",
                        Activo = true
                    };

                credencial.PasswordHash =
                    _passwordHasher.HashPassword(
                        credencial,
                        model.Password);

                _context.Credenciales.Add(credencial);
                RegistrarAuditoria(
                    User.GetUserId(),
                    "RegistrarPsicologoLegacy",
                    "Usuario",
                    usuario.Id.ToString(),
                    "Correcto");
                await _context.SaveChangesAsync();

                return Ok("Psicólogo creado correctamente");
            }
            catch
            {
                return StatusCode(
                    StatusCodes.Status400BadRequest,
                    "No se pudo completar el registro del psicologo.");
            }
        }

        [HttpDelete("eliminar-psicologo/{id}")]
        public async Task<IActionResult> EliminarPsicologo(int id)
        {
            try
            {
                var credencial =
                    await _context.Credenciales
                    .FirstOrDefaultAsync(x =>
                        x.UsuarioId == id &&
                        x.Rol == "Psicologo");

                var usuario =
                    await _context.Usuarios
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (usuario == null)
                    return NotFound("No existe");

                if (credencial == null)
                    return NotFound("Psicologo no encontrado.");

                // Conserva citas, notas y trazabilidad clinica vinculadas al profesional.
                credencial.Activo = false;

                var perfil = await _context.PerfilesPsicologo
                    .FirstOrDefaultAsync(x => x.UsuarioId == id);

                if (perfil != null)
                    perfil.Activo = false;

                RegistrarAuditoria(
                    User.GetUserId(),
                    "DesactivarPsicologo",
                    "Usuario",
                    id.ToString(),
                    "Correcto");
                await _context.SaveChangesAsync();

                return Ok("Psicólogo desactivado. Su historial se conserva.");
            }
            catch
            {
                return StatusCode(
                    StatusCodes.Status400BadRequest,
                    "No se pudo actualizar el estado del psicologo.");
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
                Resultado = resultado,
                FechaUtc = DateTime.UtcNow,
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "",
                CorrelationId = HttpContext.TraceIdentifier
            });
        }
    }
}
