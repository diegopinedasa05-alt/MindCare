using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;

namespace AppTesisAPI.Controllers
{
    /// <summary>
    /// Controlador encargado de realizar análisis inteligente del estado del usuario.
    /// Combina resultados del test PHQ-9 y registros emocionales.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class IAController : ControllerBase
    {
        private readonly AppDbContext _context;

        public IAController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Analiza el estado emocional del usuario basado en su último test y registro.
        /// </summary>
        /// <param name="usuarioId">ID del usuario</param>
        /// <returns>Nivel de riesgo y diagnóstico básico</returns>
        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> Analizar(int usuarioId)
        {
            var ultimoTest = await _context.TestPHQ9
                .Where(t => t.UsuarioId == usuarioId)
                .OrderByDescending(t => t.Fecha)
                .FirstOrDefaultAsync();

            var ultimoRegistro = await _context.RegistrosEmocionales
                .Where(r => r.UsuarioId == usuarioId)
                .OrderByDescending(r => r.Fecha)
                .FirstOrDefaultAsync();

            if (ultimoTest == null || ultimoRegistro == null)
            {
                return Ok(new
                {
                    nivel = "Sin datos",
                    mensaje = "Falta información para análisis",
                    puntaje = 0,
                    animo = 0,
                    estres = 0
                });
            }

            string nivel = "Bajo";
            string mensaje = "Estado emocional estable";

            // 🔥 LÓGICA DE ANÁLISIS (BASE IA)
            if (ultimoTest.PuntajeTotal >= 15 ||
                ultimoRegistro.NivelAnimo <= 3 ||
                ultimoRegistro.NivelEstres >= 8)
            {
                nivel = "Alto";
                mensaje = "Riesgo alto de depresión. Se recomienda atención profesional.";
            }
            else if (ultimoTest.PuntajeTotal >= 10)
            {
                nivel = "Medio";
                mensaje = "Riesgo moderado. Se recomienda seguimiento.";
            }

            return Ok(new
            {
                nivel,
                mensaje,
                puntaje = ultimoTest.PuntajeTotal,
                animo = ultimoRegistro.NivelAnimo,
                estres = ultimoRegistro.NivelEstres
            });
        }
    }
}