using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Services;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPatientAccessService _patientAccess;
        private readonly IPsychologistVerificationService _verification;

        public UsuariosController(
            AppDbContext context,
            IPatientAccessService patientAccess,
            IPsychologistVerificationService verification)
        {
            _context = context;
            _patientAccess = patientAccess;
            _verification = verification;
        }

        [HttpGet("pacientes")]
        [Authorize(Roles = "Psicologo,Admin")]
        public async Task<IActionResult> GetPacientes()
        {
            var pacientesQuery = _context.Credenciales
                .Where(c => c.Rol == "Usuario")
                .Join(
                    _context.Usuarios,
                    c => c.UsuarioId,
                    u => u.Id,
                    (c, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        u.Telefono,
                        u.Zona,
                        c.Email
                });

            if (User.IsPsicologo())
            {
                if (!await _verification.CanProvideClinicalCareAsync(User))
                    return Forbid();

                var psicologoId = User.GetUserId();
                pacientesQuery = pacientesQuery.Where(x =>
                    _context.PacientePsicologos.Any(a =>
                        a.PacienteId == x.Id &&
                        a.PsicologoId == psicologoId &&
                        a.Activo));
            }

            var pacientes = await pacientesQuery
                .OrderBy(x => x.Nombre)
                .ToListAsync();

            return Ok(pacientes);
        }

        [HttpGet("psicologos")]
        [Authorize]
        public async Task<IActionResult> GetPsicologos()
        {
            var psicologos =
                await _context.Credenciales
                .Where(c =>
                    c.Rol == "Psicologo" &&
                    c.Activo &&
                    (
                        !_context.PerfilesPsicologo
                            .Any(p => p.UsuarioId == c.UsuarioId) ||
                        _context.PerfilesPsicologo
                            .Any(p =>
                                p.UsuarioId == c.UsuarioId &&
                                p.Activo &&
                                p.EstadoVerificacion == "Verificado")
                    ))
                .Join(
                    _context.Usuarios,
                    c => c.UsuarioId,
                    u => u.Id,
                    (c, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        u.Telefono,
                        u.Zona,
                        u.Especialidad,
                        c.Email
                    })
                .ToListAsync();

            return Ok(psicologos);
        }

        [HttpGet("buscar-correo/{email}")]
        [Authorize(Roles = "Psicologo,Admin")]
        public Task<IActionResult> BuscarPorCorreo(string email)
        {
            return BuscarPacientePorCorreo(email);
        }

        [HttpGet("buscar")]
        [Authorize(Roles = "Psicologo,Admin")]
        public Task<IActionResult> Buscar([FromQuery] string correo)
        {
            return BuscarPacientePorCorreo(correo);
        }

        private async Task<IActionResult> BuscarPacientePorCorreo(string? email)
        {
            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
            {
                return Forbid();
            }

            if (string.IsNullOrWhiteSpace(email))
                return BadRequest("Ingresa el correo del paciente.");

            var correo = email.Trim().ToLowerInvariant();

            var usuario =
                await _context.Credenciales
                .Where(c =>
                    c.Email.ToLower() == correo &&
                    c.Rol == "Usuario")
                .Join(
                    _context.Usuarios,
                    c => c.UsuarioId,
                    u => u.Id,
                    (c, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        u.Telefono,
                        u.Zona,
                        c.Email
                    })
                .FirstOrDefaultAsync();

            if (usuario == null)
                return NotFound("Usuario no encontrado");

            return Ok(usuario);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            if (!await _patientAccess.CanReadAsync(User, id))
                return Forbid();

            var usuario =
                await _context.Credenciales
                .Where(c => c.UsuarioId == id)
                .Join(
                    _context.Usuarios,
                    c => c.UsuarioId,
                    u => u.Id,
                    (c, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        u.Telefono,
                        u.Zona,
                        u.Especialidad,
                        u.FechaRegistro,
                        c.Email,
                        c.Rol,
                        c.Activo
                    })
                .FirstOrDefaultAsync();

            if (usuario == null)
                return NotFound("Usuario no encontrado");

            return Ok(usuario);
        }
    }
}
