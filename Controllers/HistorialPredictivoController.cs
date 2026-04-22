using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    /// <summary>
    /// Controlador encargado de la gestión del historial predictivo del usuario.
    /// Permite consultar y almacenar niveles de riesgo generados a partir del análisis emocional.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class HistorialPredictivoController : ControllerBase
    {
        private readonly AppDbContext _context;

        /// <summary>
        /// Constructor que inicializa el contexto de base de datos.
        /// </summary>
        public HistorialPredictivoController(AppDbContext context)
        {
            _context = context;
        }

        // ===============================
        // OBTENER TODO EL HISTORIAL
        // ===============================

        /// <summary>
        /// Obtiene todos los registros del historial predictivo.
        /// </summary>
        /// <returns>Lista completa de historial</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<HistorialPredictivo>>> GetHistorial()
        {
            var historial = await _context.HistorialPredictivo
                .OrderByDescending(h => h.Fecha)
                .ToListAsync();

            return Ok(historial);
        }

        // ===============================
        // OBTENER POR USUARIO (IMPORTANTE 🔥)
        // ===============================

        /// <summary>
        /// Obtiene el historial predictivo de un usuario específico.
        /// </summary>
        /// <param name="usuarioId">ID del usuario</param>
        /// <returns>Lista de registros del usuario</returns>
        [HttpGet("usuario/{usuarioId}")]
        public async Task<IActionResult> GetPorUsuario(int usuarioId)
        {
            var historial = await _context.HistorialPredictivo
                .Where(h => h.UsuarioId == usuarioId)
                .OrderByDescending(h => h.Fecha)
                .ToListAsync();

            return Ok(historial);
        }

        // ===============================
        // GUARDAR PREDICCIÓN
        // ===============================

        /// <summary>
        /// Guarda un nuevo registro en el historial predictivo.
        /// </summary>
        /// <param name="prediccion">Objeto con nivel de riesgo</param>
        /// <returns>Registro guardado</returns>
        [HttpPost]
        public async Task<IActionResult> PostPrediccion([FromBody] HistorialPredictivo prediccion)
        {
            // 🔹 Validación
            if (prediccion == null || prediccion.UsuarioId <= 0)
                return BadRequest("Datos inválidos");

            // 🔹 Validar usuario
            var existeUsuario = await _context.Usuarios
                .AnyAsync(u => u.Id == prediccion.UsuarioId);

            if (!existeUsuario)
                return NotFound("Usuario no encontrado");

            // 🔹 Asignar fecha automáticamente
            prediccion.Fecha = DateTime.Now;

            _context.HistorialPredictivo.Add(prediccion);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Predicción guardada correctamente",
                prediccion
            });
        }
    }
}