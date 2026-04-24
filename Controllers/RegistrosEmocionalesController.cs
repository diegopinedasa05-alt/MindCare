using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    /// <summary>
    /// Controlador encargado de la gestión de registros emocionales del usuario.
    /// Permite almacenar y consultar estados emocionales.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class RegistrosEmocionalesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RegistrosEmocionalesController(AppDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // CREAR REGISTRO
        // ==========================================
        [HttpPost]
        public async Task<IActionResult> Crear(
            [FromBody] RegistrosEmocionales registro)
        {
            try
            {
                if (registro == null ||
                    registro.UsuarioId <= 0)
                {
                    return BadRequest(
                        "Datos inválidos"
                    );
                }

                var existeUsuario =
                    await _context.Usuarios
                    .AnyAsync(x =>
                        x.Id ==
                        registro.UsuarioId);

                if (!existeUsuario)
                {
                    return NotFound(
                        "Usuario no encontrado"
                    );
                }

                if (
                    registro.NivelAnimo < 0 ||
                    registro.NivelAnimo > 10 ||

                    registro.NivelEstres < 0 ||
                    registro.NivelEstres > 10
                )
                {
                    return BadRequest(
                        "Los niveles deben estar entre 0 y 10"
                    );
                }

                /* =====================================
                   FECHA MÉXICO 🇲🇽 CORREGIDA
                ===================================== */

                registro.Fecha =
                    ObtenerHoraMexico();

                _context
                    .RegistrosEmocionales
                    .Add(registro);

                await _context
                    .SaveChangesAsync();

                return Ok(new
                {
                    mensaje =
                    "Registro emocional guardado correctamente"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.Message
                );
            }
        }

        // ==========================================
        // OBTENER HISTORIAL
        // ==========================================
        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> Get(
            int usuarioId)
        {
            var datos =
                await _context
                .RegistrosEmocionales
                .Where(x =>
                    x.UsuarioId ==
                    usuarioId)
                .OrderByDescending(x =>
                    x.Fecha)
                .ToListAsync();

            return Ok(datos);
        }

        // ==========================================
        // PROMEDIOS
        // ==========================================
        [HttpGet("promedio/{usuarioId}")]
        public async Task<IActionResult>
            GetPromedio(int usuarioId)
        {
            var registros =
                await _context
                .RegistrosEmocionales
                .Where(x =>
                    x.UsuarioId ==
                    usuarioId)
                .ToListAsync();

            if (!registros.Any())
            {
                return Ok(new
                {
                    mensaje = "Sin datos"
                });
            }

            var promedioAnimo =
                registros.Average(x =>
                    x.NivelAnimo);

            var promedioEstres =
                registros.Average(x =>
                    x.NivelEstres);

            return Ok(new
            {
                promedioAnimo,
                promedioEstres
            });
        }

        // ==========================================
        // MÉTODO HORA MÉXICO (Railway/Linux/Windows)
        // ==========================================
        private DateTime ObtenerHoraMexico()
        {
            try
            {
                // Linux Railway
                var zona =
                    TimeZoneInfo
                    .FindSystemTimeZoneById(
                        "America/Mexico_City"
                    );

                return TimeZoneInfo
                    .ConvertTimeFromUtc(
                        DateTime.UtcNow,
                        zona
                    );
            }
            catch
            {
                try
                {
                    // Windows local
                    var zona =
                        TimeZoneInfo
                        .FindSystemTimeZoneById(
                            "Central Standard Time (Mexico)"
                        );

                    return TimeZoneInfo
                        .ConvertTimeFromUtc(
                            DateTime.UtcNow,
                            zona
                        );
                }
                catch
                {
                    // Respaldo
                    return DateTime.Now;
                }
            }
        }
    }
}