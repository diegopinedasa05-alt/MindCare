using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestEstresLaboralController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestEstresLaboralController(AppDbContext context)
        {
            _context = context;
        }

        /* ==========================================
           POST GUARDAR TEST
        ========================================== */
        [HttpPost]
        public async Task<IActionResult> Guardar(
            [FromBody] dynamic body)
        {
            try
            {
                int usuarioId =
                    (int)body.usuarioId;

                var respuestas =
                    ((Newtonsoft.Json.Linq.JArray)
                    body.respuestas)
                    .Select(x => (int)x)
                    .ToList();

                if (respuestas.Count != 12)
                    return BadRequest(
                        "Se requieren 12 respuestas."
                    );

                int total =
                    respuestas.Sum();

                string nivel =
                    ObtenerNivel(total);

                var test =
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
                    };

                _context.Add(test);

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
                    nivel = nivel
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.Message
                );
            }
        }

        /* ==========================================
           GET HISTORIAL
        ========================================== */
        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> Obtener(
            int usuarioId)
        {
            var lista =
                await _context.Set<TestEstresLaboral>()
                .Where(x =>
                    x.UsuarioId == usuarioId)
                .OrderByDescending(x =>
                    x.Fecha)
                .ToListAsync();

            return Ok(
                lista.Select(x => new
                {
                    puntaje =
                        x.PuntajeTotal,

                    nivel =
                        ObtenerNivel(
                            x.PuntajeTotal),

                    fecha =
                        x.Fecha
                })
            );
        }

        /* ==========================================
           NIVEL
        ========================================== */
        private string ObtenerNivel(
            int p)
        {
            if (p <= 12)
                return "Sin estrés";

            if (p <= 24)
                return "Fase de alarma";

            if (p <= 36)
                return "Estrés leve";

            if (p <= 48)
                return "Estrés medio";

            if (p <= 60)
                return "Estrés alto";

            return "Estrés grave";
        }
    }
}