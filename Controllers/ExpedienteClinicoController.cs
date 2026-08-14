using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Services;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ExpedienteClinicoController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAService _iaService;
        private readonly IPatientAccessService _patientAccess;

        public ExpedienteClinicoController(
            AppDbContext context,
            IAService iaService,
            IPatientAccessService patientAccess)
        {
            _context = context;
            _iaService = iaService;
            _patientAccess = patientAccess;
        }

        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> Obtener(int usuarioId)
        {
            if (!await _patientAccess.CanReadAsync(User, usuarioId))
                return Forbid();

            var usuario =
                await _context.Credenciales
                .Where(c => c.UsuarioId == usuarioId)
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

            var registros =
                await _context.RegistrosEmocionales
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.Fecha,
                    x.NivelAnimo,
                    x.NivelEstres,
                    x.Categoria,
                    x.Nota
                })
                .ToListAsync();

            var phq9 =
                await _context.TestPHQ9
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            var estresLaboral =
                await _context.TestEstresLaboral
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            var citas =
                await _context.Citas
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.Fecha,
                    x.Estado,
                    x.Observacion,
                    x.FechaAtencionUtc,
                    x.FechaEstadoUtc,
                    x.EstadoActualizadoPorUsuarioId,
                    x.PsicologoId,
                    psicologo =
                        _context.Usuarios
                        .Where(u => u.Id == x.PsicologoId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault()
                })
                .ToListAsync();

            var puedeVerNotas =
                User.IsAdmin() ||
                User.IsPsicologo();

            var notas =
                new List<object>();

            if (puedeVerNotas)
            {
                var notasQuery = _context.NotasSeguimiento
                    .Where(x => x.PacienteId == usuarioId);

                if (User.IsPsicologo())
                {
                    var psicologoId = User.GetUserId();
                    notasQuery = notasQuery.Where(x =>
                        x.PsicologoId == psicologoId);
                }

                notas =
                    await notasQuery
                    .OrderByDescending(x => x.Fecha)
                    .Select(x => (object)new
                    {
                        x.Id,
                        x.CitaId,
                        x.Fecha,
                        x.Nota,
                        x.PlanAccion,
                        x.PsicologoId,
                        psicologo =
                            _context.Usuarios
                            .Where(u => u.Id == x.PsicologoId)
                            .Select(u => u.Nombre)
                            .FirstOrDefault()
                    })
                    .ToListAsync();
            }

            var ultimoPHQ9 =
                phq9.FirstOrDefault();

            var ultimoEstres =
                estresLaboral.FirstOrDefault();

            var ultimoRegistro =
                await _context.RegistrosEmocionales
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .FirstOrDefaultAsync();

            var desde =
                DateTime.UtcNow.AddDays(-14);

            var registrosRecientes =
                await _context.RegistrosEmocionales
                .Where(x =>
                    x.UsuarioId == usuarioId &&
                    x.Fecha >= desde)
                .OrderBy(x => x.Fecha)
                .ToListAsync();

            var ia =
                _iaService.Evaluar(
                    ultimoPHQ9,
                    ultimoEstres,
                    ultimoRegistro,
                    registrosRecientes);

            var resumen =
                new
                {
                    totalRegistros = registros.Count,
                    totalEvaluaciones =
                        phq9.Count + estresLaboral.Count,
                    totalCitas = citas.Count,
                    totalNotas = puedeVerNotas ? notas.Count : 0,
                    ultimoAnimo =
                        registros.FirstOrDefault()?.NivelAnimo,
                    ultimoEstres =
                        registros.FirstOrDefault()?.NivelEstres,
                    ultimoPHQ9 =
                        phq9.FirstOrDefault()?.PuntajeTotal,
                    ultimoEstresLaboral =
                        estresLaboral.FirstOrDefault()?.PuntajeTotal
                };

            return Ok(new
            {
                usuario,
                resumen,
                registros,
                phq9 =
                    phq9.Select(x => new
                    {
                        x.Id,
                        x.Fecha,
                        puntaje = x.PuntajeTotal,
                        nivel = NivelPHQ9(x.PuntajeTotal),
                        respuestas = new[]
                        {
                            x.P1, x.P2, x.P3, x.P4, x.P5,
                            x.P6, x.P7, x.P8, x.P9
                        }
                    }),
                estresLaboral =
                    estresLaboral.Select(x => new
                    {
                        x.Id,
                        x.Fecha,
                        puntaje = x.PuntajeTotal,
                        nivel = NivelEstres(x.PuntajeTotal)
                    }),
                citas,
                notas,
                ia
            });
        }

        private static string NivelPHQ9(int puntaje)
        {
            if (puntaje <= 4) return "Minimo";
            if (puntaje <= 9) return "Leve";
            if (puntaje <= 14) return "Moderado";
            if (puntaje <= 19) return "Moderadamente severo";
            return "Severo";
        }

        private static string NivelEstres(int puntaje)
        {
            if (puntaje <= 12) return "Sin estres";
            if (puntaje <= 24) return "Fase de alarma";
            if (puntaje <= 36) return "Estres leve";
            if (puntaje <= 48) return "Estres medio";
            if (puntaje <= 60) return "Estres alto";
            return "Estres grave";
        }
    }
}
