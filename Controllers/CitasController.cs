using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;
using AppTesisAPI.Services;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CitasController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPatientAccessService _patientAccess;
        private readonly IPsychologistVerificationService _verification;

        public CitasController(
            AppDbContext context,
            IPatientAccessService patientAccess,
            IPsychologistVerificationService verification)
        {
            _context = context;
            _patientAccess = patientAccess;
            _verification = verification;
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] Cita cita)
        {
            if (cita == null)
                return BadRequest("Datos vacíos");

            if (cita.UsuarioId <= 0 || cita.PsicologoId <= 0)
                return BadRequest("Paciente o psicólogo inválido");

            var currentUserId = User.GetUserId();

            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
            {
                return Forbid();
            }

            var permitido =
                User.IsAdmin() ||
                (User.IsPsicologo() && currentUserId == cita.PsicologoId);

            if (!permitido)
                return Forbid();

            var existeUsuario =
                await _context.Usuarios
                .AnyAsync(x => x.Id == cita.UsuarioId);

            if (!existeUsuario)
                return BadRequest("Paciente no encontrado");

            var existePsicologo =
                await _context.Credenciales
                .AnyAsync(x =>
                    x.UsuarioId == cita.PsicologoId &&
                    x.Rol == "Psicologo" &&
                    x.Activo);

            if (!existePsicologo)
                return BadRequest("Psicólogo no encontrado");

            if (cita.Fecha.ToUniversalTime() <= DateTime.UtcNow)
                return BadRequest("La cita debe programarse en una fecha futura.");

            var existeConflicto = await _context.Citas.AnyAsync(x =>
                x.PsicologoId == cita.PsicologoId &&
                x.Fecha == cita.Fecha &&
                x.Estado != "Cancelada");

            if (existeConflicto)
                return Conflict("El psicologo ya tiene una cita en ese horario.");

            if (cita.Fecha == default)
                return BadRequest("Fecha inválida");

            cita.Estado = "Pendiente";
            cita.Observacion ??= "";
            cita.FechaCreacion = DateTime.UtcNow;

            _context.Citas.Add(cita);

            var asignacion =
                await _context.PacientePsicologos
                .FirstOrDefaultAsync(x =>
                    x.PacienteId == cita.UsuarioId &&
                    x.PsicologoId == cita.PsicologoId);

            if (asignacion == null)
            {
                _context.PacientePsicologos.Add(
                    new PacientePsicologo
                    {
                        PacienteId = cita.UsuarioId,
                        PsicologoId = cita.PsicologoId,
                        FechaAsignacion = DateTime.UtcNow,
                        Activo = true
                    });
            }
            else if (!asignacion.Activo)
            {
                asignacion.Activo = true;
                asignacion.FechaAsignacion = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Cita creada"
            });
        }

        [HttpGet("usuario/{id}")]
        public async Task<IActionResult> Usuario(int id)
        {
            if (!await _patientAccess.CanReadAsync(User, id))
                return Forbid();

            var citas = _context.Citas.Where(x => x.UsuarioId == id);

            if (User.IsPsicologo())
            {
                var psicologoId = User.GetUserId();
                citas = citas.Where(x => x.PsicologoId == psicologoId);
            }

            var lista = await citas
                .OrderBy(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.UsuarioId,
                    x.PsicologoId,
                    x.Fecha,
                    x.Estado,
                    x.Observacion,
                    nombrePsicologo =
                        _context.Usuarios
                        .Where(u => u.Id == x.PsicologoId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpGet("psicologo/{id}")]
        public async Task<IActionResult> Psicologo(int id)
        {
            if (!User.IsAdmin() &&
                User.GetUserId() != id)
                return Forbid();

            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
            {
                return Forbid();
            }

            var lista =
                await _context.Citas
                .Where(x => x.PsicologoId == id)
                .OrderBy(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.UsuarioId,
                    x.PsicologoId,
                    x.Fecha,
                    x.Estado,
                    x.Observacion,
                    nombrePaciente =
                        _context.Usuarios
                        .Where(u => u.Id == x.UsuarioId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPut("cancelar/{id}")]
        public async Task<IActionResult> Cancelar(int id)
        {
            var cita = await _context.Citas.FindAsync(id);

            if (cita == null)
                return NotFound();

            var currentUserId = User.GetUserId();

            if (!User.IsAdmin() &&
                currentUserId != cita.UsuarioId &&
                currentUserId != cita.PsicologoId)
                return Forbid();

            cita.Estado = "Cancelada";
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
