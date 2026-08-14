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
    [Authorize(Roles = "Psicologo,Admin")]
    public class PsicologoDashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPsychologistVerificationService _verification;

        public PsicologoDashboardController(
            AppDbContext context,
            IPsychologistVerificationService verification)
        {
            _context = context;
            _verification = verification;
        }

        [HttpGet("resumen")]
        public async Task<IActionResult> Resumen()
        {
            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
                return Forbid();

            var psicologoId = ObtenerPsicologoId();

            if (psicologoId == null)
                return Forbid();

            var hoy = DateTime.UtcNow.Date;
            var manana = hoy.AddDays(1);

            var pacientesIds =
                await _context.PacientePsicologos
                .Where(x =>
                    x.PsicologoId == psicologoId &&
                    x.Activo)
                .Select(x => x.PacienteId)
                .ToListAsync();

            var citas =
                await _context.Citas
                .Where(x => x.PsicologoId == psicologoId)
                .ToListAsync();

            var riesgoAlto =
                await _context.HistorialPredictivo
                .Where(x =>
                    pacientesIds.Contains(x.UsuarioId) &&
                    (x.NivelRiesgo.Contains("Alto") ||
                     x.NivelRiesgo.Contains("Severo") ||
                     x.NivelRiesgo.Contains("Crítico") ||
                     x.NivelRiesgo.Contains("grave")))
                .Select(x => x.UsuarioId)
                .Distinct()
                .CountAsync();

            return Ok(new
            {
                totalPacientes = pacientesIds.Count,
                citasHoy =
                    citas.Count(x =>
                        x.Fecha >= hoy &&
                        x.Fecha < manana &&
                        x.Estado != "Cancelada"),
                riesgoAlto,
                pendientes =
                    citas.Count(x => x.Estado == "Pendiente")
            });
        }

        [HttpGet("pacientes")]
        public async Task<IActionResult> Pacientes()
        {
            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
                return Forbid();

            var psicologoId = ObtenerPsicologoId();

            if (psicologoId == null)
                return Forbid();

            var pacientes =
                await _context.PacientePsicologos
                .Where(x =>
                    x.PsicologoId == psicologoId &&
                    x.Activo)
                .Join(
                    _context.Usuarios,
                    a => a.PacienteId,
                    u => u.Id,
                    (a, u) => new
                    {
                        asignacion = a,
                        usuario = u
                    })
                .OrderBy(x => x.usuario.Nombre)
                .ToListAsync();

            var resultado = new List<object>();

            foreach (var item in pacientes)
            {
                var pacienteId = item.usuario.Id;

                var ultimoRegistro =
                    await _context.RegistrosEmocionales
                    .Where(x => x.UsuarioId == pacienteId)
                    .OrderByDescending(x => x.Fecha)
                    .FirstOrDefaultAsync();

                var ultimoPHQ =
                    await _context.TestPHQ9
                    .Where(x => x.UsuarioId == pacienteId)
                    .OrderByDescending(x => x.Fecha)
                    .FirstOrDefaultAsync();

                var ultimoEstres =
                    await _context.TestEstresLaboral
                    .Where(x => x.UsuarioId == pacienteId)
                    .OrderByDescending(x => x.Fecha)
                    .FirstOrDefaultAsync();

                var riesgo =
                    await _context.HistorialPredictivo
                    .Where(x => x.UsuarioId == pacienteId)
                    .OrderByDescending(x => x.Fecha)
                    .FirstOrDefaultAsync();

                var proximaCita =
                    await _context.Citas
                    .Where(x =>
                        x.UsuarioId == pacienteId &&
                        x.PsicologoId == psicologoId &&
                        x.Fecha >= DateTime.UtcNow &&
                        x.Estado != "Cancelada")
                    .OrderBy(x => x.Fecha)
                    .FirstOrDefaultAsync();

                var notas =
                    await _context.NotasSeguimiento
                    .Where(x =>
                        x.PacienteId == pacienteId &&
                        x.PsicologoId == psicologoId)
                    .CountAsync();

                var hoy = DateTime.UtcNow.Date;

                var seguimientoHoy =
                    await _context.SeguimientosUsuario
                    .Where(x =>
                        x.UsuarioId == pacienteId &&
                        x.Fecha == hoy)
                    .FirstOrDefaultAsync();

                resultado.Add(new
                {
                    id = pacienteId,
                    nombre = item.usuario.Nombre,
                    telefono = item.usuario.Telefono,
                    zona = item.usuario.Zona,
                    fechaAsignacion = item.asignacion.FechaAsignacion,
                    ultimoAnimo = ultimoRegistro?.NivelAnimo,
                    ultimoEstres = ultimoRegistro?.NivelEstres,
                    ultimoRegistroFecha = ultimoRegistro?.Fecha,
                    phq9 = ultimoPHQ?.PuntajeTotal,
                    estresLaboral = ultimoEstres?.PuntajeTotal,
                    riesgo = riesgo?.NivelRiesgo ?? "Sin datos",
                    proximaCita = proximaCita?.Fecha,
                    notas,
                    seguimientoHoy =
                        seguimientoHoy == null
                            ? 0
                            : seguimientoHoy.TotalTareas <= 0
                                ? 0
                                : Math.Round(
                                    (double)seguimientoHoy.TareasCompletadas /
                                    seguimientoHoy.TotalTareas * 100,
                                    0),
                    seguimientoActualizado =
                        seguimientoHoy?.FechaActualizacion
                });
            }

            return Ok(resultado);
        }

        [HttpPost("pacientes/{pacienteId}/asignar")]
        public async Task<IActionResult> AsignarPaciente(int pacienteId)
        {
            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
                return Forbid();

            var psicologoId = ObtenerPsicologoId();

            if (psicologoId == null)
                return Forbid();

            var existePaciente =
                await _context.Credenciales
                .AnyAsync(x =>
                    x.UsuarioId == pacienteId &&
                    x.Rol == "Usuario" &&
                    x.Activo);

            if (!existePaciente)
                return NotFound("Paciente no encontrado");

            await AsegurarAsignacion(pacienteId, psicologoId.Value);

            return Ok(new
            {
                mensaje = "Paciente asignado correctamente"
            });
        }

        [HttpGet("pacientes/{pacienteId}/notas")]
        public async Task<IActionResult> Notas(int pacienteId)
        {
            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
                return Forbid();

            var psicologoId = ObtenerPsicologoId();

            if (psicologoId == null)
                return Forbid();

            if (!await TieneAsignacion(pacienteId, psicologoId.Value))
                return Forbid();

            var notas =
                await _context.NotasSeguimiento
                .Where(x =>
                    x.PacienteId == pacienteId &&
                    x.PsicologoId == psicologoId)
                .OrderByDescending(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.CitaId,
                    x.Nota,
                    x.PlanAccion,
                    x.Fecha
                })
                .ToListAsync();

            return Ok(notas);
        }

        [HttpPost("pacientes/{pacienteId}/notas")]
        public async Task<IActionResult> CrearNota(
            int pacienteId,
            [FromBody] NotaSeguimientoRequest request)
        {
            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
                return Forbid();

            var psicologoId = ObtenerPsicologoId();

            if (psicologoId == null)
                return Forbid();

            if (!await TieneAsignacion(pacienteId, psicologoId.Value))
                return Forbid();

            if (request == null ||
                string.IsNullOrWhiteSpace(request.Nota))
                return BadRequest("La nota es obligatoria.");

            var nota =
                new NotaSeguimiento
                {
                    PacienteId = pacienteId,
                    PsicologoId = psicologoId.Value,
                    Nota = request.Nota.Trim(),
                    PlanAccion = request.PlanAccion?.Trim() ?? "",
                    Fecha = DateTime.UtcNow
                };

            _context.NotasSeguimiento.Add(nota);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Nota guardada correctamente",
                nota.Id
            });
        }

        private int? ObtenerPsicologoId()
        {
            if (User.IsAdmin())
                return User.GetUserId();

            return User.GetUserId();
        }

        private async Task<bool> TieneAsignacion(
            int pacienteId,
            int psicologoId)
        {
            return await _context.PacientePsicologos
                .AnyAsync(x =>
                    x.PacienteId == pacienteId &&
                    x.PsicologoId == psicologoId &&
                    x.Activo);
        }

        private async Task AsegurarAsignacion(
            int pacienteId,
            int psicologoId)
        {
            var asignacion =
                await _context.PacientePsicologos
                .FirstOrDefaultAsync(x =>
                    x.PacienteId == pacienteId &&
                    x.PsicologoId == psicologoId);

            if (asignacion == null)
            {
                _context.PacientePsicologos.Add(
                    new PacientePsicologo
                    {
                        PacienteId = pacienteId,
                        PsicologoId = psicologoId,
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
        }
    }
}
