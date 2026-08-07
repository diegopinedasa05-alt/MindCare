using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;
using AppTesisAPI.Services;

namespace AppTesisAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TestEstresLaboralController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPatientAccessService _patientAccess;

        public TestEstresLaboralController(
            AppDbContext context,
            IPatientAccessService patientAccess)
        {
            _context = context;
            _patientAccess = patientAccess;
        }

        [HttpPost]
        public async Task<IActionResult> Guardar(
            [FromBody] TestPHQ9Request body)
        {
            try
            {
                if (body == null)
                    return BadRequest("Datos inválidos.");

                var usuarioId = body.UsuarioId;
                var respuestas = body.Respuestas;

                if (usuarioId <= 0)
                    return BadRequest("Usuario inválido.");

                if (respuestas == null ||
                    respuestas.Count != 12)
                    return BadRequest("Se requieren 12 respuestas.");

                if (respuestas.Any(x => x < 1 || x > 6))
                    return BadRequest(
                        "Las respuestas deben estar entre 1 y 6.");

                if (!User.IsAdmin() &&
                    User.GetUserId() != usuarioId)
                    return Forbid();

                var total = respuestas.Sum();
                var nivel = ObtenerNivel(total);

                _context.TestEstresLaboral.Add(
                    new TestEstresLaboral
                    {
                        UsuarioId = usuarioId,
                        P1 = respuestas[0],
                        P2 = respuestas[1],
                        P3 = respuestas[2],
                        P4 = respuestas[3],
                        P5 = respuestas[4],
                        P6 = respuestas[5],
                        P7 = respuestas[6],
                        P8 = respuestas[7],
                        P9 = respuestas[8],
                        P10 = respuestas[9],
                        P11 = respuestas[10],
                        P12 = respuestas[11],
                        PuntajeTotal = total,
                        Fecha = DateTime.UtcNow
                    });

                _context.HistorialPredictivo.Add(
                    new HistorialPredictivo
                    {
                        UsuarioId = usuarioId,
                        NivelRiesgo = nivel,
                        Fecha = DateTime.UtcNow,
                        Origen = "Estrés Laboral"
                    });

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    puntaje = total,
                    nivel
                });
            }
            catch
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    "No se pudo guardar la evaluación de estrés.");
            }
        }

        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> Obtener(int usuarioId)
        {
            if (!await _patientAccess.CanReadAsync(User, usuarioId))
                return Forbid();

            var lista =
                await _context.TestEstresLaboral
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            return Ok(lista.Select(x => new
            {
                puntaje = x.PuntajeTotal,
                nivel = ObtenerNivel(x.PuntajeTotal),
                fecha = x.Fecha
            }));
        }

        private string ObtenerNivel(int p)
        {
            if (p <= 12) return "Sin estrés";
            if (p <= 24) return "Fase de alarma";
            if (p <= 36) return "Estrés leve";
            if (p <= 48) return "Estrés medio";
            if (p <= 60) return "Estrés alto";
            return "Estrés grave";
        }
    }
}
