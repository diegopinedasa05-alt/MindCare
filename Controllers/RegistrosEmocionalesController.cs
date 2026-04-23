using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    /// <summary>
    /// Controlador encargado de la gestión de registros emocionales del usuario.
    /// Permite almacenar y consultar estados emocionales a lo largo del tiempo.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class RegistrosEmocionalesController : ControllerBase
    {
        private readonly AppDbContext _context;

        /// <summary>
        /// Constructor que inicializa el contexto de base de datos.
        /// </summary>
        public RegistrosEmocionalesController(AppDbContext context)
        {
            _context = context;
        }

        // ===============================
        // CREAR REGISTRO
        // ===============================

        /// <summary>
        /// Registra un nuevo estado emocional del usuario.
        /// </summary>
        /// <param name="registro">Datos emocionales</param>
        /// <returns>Mensaje de confirmación</returns>
        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] RegistrosEmocionales registro)
        {
            // 🔹 Validación básica
            if (registro == null || registro.UsuarioId <= 0)
                return BadRequest("Datos inválidos");

            // 🔹 Validar existencia de usuario
            var existeUsuario = await _context.Usuarios
                .AnyAsync(u => u.Id == registro.UsuarioId);

            if (!existeUsuario)
                return NotFound("Usuario no encontrado");

            // 🔹 Validar rangos (opcional pero PRO)
            if (registro.NivelAnimo < 0 || registro.NivelAnimo > 10 ||
                registro.NivelEstres < 0 || registro.NivelEstres > 10)
            {
                return BadRequest("Los niveles deben estar entre 0 y 10");
            }

            // 🔹 Asignar fecha automática
            registro.Fecha = DateTime.UtcNow;

            _context.RegistrosEmocionales.Add(registro);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Registro emocional guardado correctamente" });
        }

        // ===============================
        // OBTENER POR USUARIO
        // ===============================

        /// <summary>
        /// Obtiene todos los registros emocionales de un usuario.
        /// </summary>
        /// <param name="usuarioId">ID del usuario</param>
        /// <returns>Lista de registros ordenados por fecha</returns>
        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> Get(int usuarioId)
        {
            var datos = await _context.RegistrosEmocionales
                .Where(r => r.UsuarioId == usuarioId)
                .OrderByDescending(r => r.Fecha)
                .ToListAsync();

            return Ok(datos);
        }

        // ===============================
        // PROMEDIO EMOCIONAL (EXTRA PRO 🔥)
        // ===============================

        /// <summary>
        /// Calcula el promedio de ánimo y estrés del usuario.
        /// </summary>
        /// <param name="usuarioId">ID del usuario</param>
        /// <returns>Promedios emocionales</returns>
        [HttpGet("promedio/{usuarioId}")]
        public async Task<IActionResult> GetPromedio(int usuarioId)
        {
            var registros = await _context.RegistrosEmocionales
                .Where(r => r.UsuarioId == usuarioId)
                .ToListAsync();

            if (!registros.Any())
                return Ok(new { mensaje = "Sin datos" });

            var promedioAnimo = registros.Average(r => r.NivelAnimo);
            var promedioEstres = registros.Average(r => r.NivelEstres);

            return Ok(new
            {
                promedioAnimo,
                promedioEstres
            });
        }
    }
}