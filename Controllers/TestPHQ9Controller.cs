using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestPHQ9Controller : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestPHQ9Controller(AppDbContext context)
        {
            _context = context;
        }

        /* =========================================
           POST - GUARDAR TEST
        ========================================= */
        [HttpPost]
        public async Task<IActionResult> GuardarTest(
            [FromBody] TestPHQ9Request request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Datos inválidos.");

                if (
                    request.Respuestas == null ||
                    request.Respuestas.Count != 9
                )
                    return BadRequest(
                        "El test requiere 9 respuestas."
                    );

                var usuario =
                    await _context.Usuarios
                    .FindAsync(request.UsuarioId);

                if (usuario == null)
                    return BadRequest(
                        "Usuario no existe."
                    );

                int total =
                    request.Respuestas.Sum();

                string nivel =
                    ObtenerNivel(total);

                var test =
                    new TestPHQ9
                    {
                        UsuarioId =
                            request.UsuarioId,

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
                        Fecha = DateTime.Now
                    };

                _context.TestPHQ9.Add(test);

                var historial =
                    new HistorialPredictivo
                    {
                        UsuarioId =
                            request.UsuarioId,

                        NivelRiesgo =
                            nivel,

                        Fecha =
                            DateTime.Now,

                        Origen =
                            "PHQ9"
                    };

                _context.HistorialPredictivo
                    .Add(historial);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    puntaje = total,
                    nivel = nivel
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.InnerException != null
                    ? ex.InnerException.Message
                    : ex.Message
                );
            }
        }

        /* =========================================
           GET HISTORIAL
           api/TestPHQ9/2
        ========================================= */
        [HttpGet("{usuarioId}")]
        public async Task<IActionResult>
        ObtenerHistorial(int usuarioId)
        {
            var datos =
                await _context.TestPHQ9
                .Where(x =>
                    x.UsuarioId == usuarioId
                )
                .OrderByDescending(x =>
                    x.Fecha
                )
                .ToListAsync();

            var lista =
                datos.Select(x => new
                {
                    id = x.Id,
                    puntaje =
                        x.PuntajeTotal,

                    nivel =
                        ObtenerNivel(
                            x.PuntajeTotal
                        ),

                    fecha = x.Fecha
                });

            return Ok(lista);
        }

        /* =========================================
           GET ÚLTIMO
           api/TestPHQ9/ultimo/2
        ========================================= */
        [HttpGet("ultimo/{usuarioId}")]
        public async Task<IActionResult>
        ObtenerUltimo(int usuarioId)
        {
            var test =
                await _context.TestPHQ9
                .Where(x =>
                    x.UsuarioId == usuarioId
                )
                .OrderByDescending(x =>
                    x.Fecha
                )
                .FirstOrDefaultAsync();

            if (test == null)
                return NotFound();

            return Ok(new
            {
                puntaje =
                    test.PuntajeTotal,

                nivel =
                    ObtenerNivel(
                        test.PuntajeTotal
                    ),

                fecha =
                    test.Fecha
            });
        }

        /* =========================================
           MÉTODO STATIC
        ========================================= */
        private static string ObtenerNivel(int p)
        {
            if (p <= 4)
                return "Mínimo";

            if (p <= 9)
                return "Leve";

            if (p <= 14)
                return "Moderado";

            if (p <= 19)
                return "Moderadamente severo";

            return "Severo";
        }
    }
}