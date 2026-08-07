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
    public class TestPHQ9Controller : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPatientAccessService _patientAccess;

        public TestPHQ9Controller(
            AppDbContext context,
            IPatientAccessService patientAccess)
        {
            _context = context;
            _patientAccess = patientAccess;
        }

        [HttpPost]
        public async Task<IActionResult> GuardarTest(
            [FromBody] TestPHQ9Request request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Datos inválidos.");

                if (request.Respuestas == null ||
                    request.Respuestas.Count != 9)
                    return BadRequest(
                        "El test requiere 9 respuestas.");

                if (request.Respuestas.Any(x => x < 0 || x > 3))
                    return BadRequest(
                        "Las respuestas PHQ-9 deben estar entre 0 y 3.");

                if (!User.IsAdmin() &&
                    User.GetUserId() != request.UsuarioId)
                    return Forbid();

                var usuario =
                    await _context.Usuarios
                    .FindAsync(request.UsuarioId);

                if (usuario == null)
                    return BadRequest("Usuario no existe.");

                var total = request.Respuestas.Sum();
                var nivel = ObtenerNivel(total);

                var test =
                    new TestPHQ9
                    {
                        UsuarioId = request.UsuarioId,
                        P1 = request.Respuestas[0],
                        P2 = request.Respuestas[1],
                        P3 = request.Respuestas[2],
                        P4 = request.Respuestas[3],
                        P5 = request.Respuestas[4],
                        P6 = request.Respuestas[5],
                        P7 = request.Respuestas[6],
                        P8 = request.Respuestas[7],
                        P9 = request.Respuestas[8],
                        PuntajeTotal = total,
                        Fecha = DateTime.UtcNow
                    };

                _context.TestPHQ9.Add(test);
                _context.HistorialPredictivo.Add(
                    new HistorialPredictivo
                    {
                        UsuarioId = request.UsuarioId,
                        NivelRiesgo = nivel,
                        Fecha = DateTime.UtcNow,
                        Origen = "PHQ9"
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
                    "No se pudo guardar la evaluación PHQ-9.");
            }
        }

        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> ObtenerHistorial(int usuarioId)
        {
            if (!await _patientAccess.CanReadAsync(User, usuarioId))
                return Forbid();

            var datos =
                await _context.TestPHQ9
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            return Ok(datos.Select(x => new
            {
                id = x.Id,
                puntaje = x.PuntajeTotal,
                nivel = ObtenerNivel(x.PuntajeTotal),
                fecha = x.Fecha
            }));
        }

        [HttpGet("ultimo/{usuarioId}")]
        public async Task<IActionResult> ObtenerUltimo(int usuarioId)
        {
            if (!await _patientAccess.CanReadAsync(User, usuarioId))
                return Forbid();

            var test =
                await _context.TestPHQ9
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .FirstOrDefaultAsync();

            if (test == null)
                return NotFound();

            return Ok(new
            {
                puntaje = test.PuntajeTotal,
                nivel = ObtenerNivel(test.PuntajeTotal),
                fecha = test.Fecha
            });
        }

        private static string ObtenerNivel(int p)
        {
            if (p <= 4) return "Mínimo";
            if (p <= 9) return "Leve";
            if (p <= 14) return "Moderado";
            if (p <= 19) return "Moderadamente severo";
            return "Severo";
        }
    }
}
