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
    public class HistorialPredictivoController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPatientAccessService _patientAccess;

        public HistorialPredictivoController(
            AppDbContext context,
            IPatientAccessService patientAccess)
        {
            _context = context;
            _patientAccess = patientAccess;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<HistorialPredictivo>>>
            GetHistorial()
        {
            var historial =
                await _context.HistorialPredictivo
                .OrderByDescending(h => h.Fecha)
                .ToListAsync();

            return Ok(historial);
        }

        [HttpGet("usuario/{usuarioId}")]
        public async Task<IActionResult> GetPorUsuario(int usuarioId)
        {
            if (!await _patientAccess.CanReadAsync(User, usuarioId))
                return Forbid();

            var historial =
                await _context.HistorialPredictivo
                .Where(h => h.UsuarioId == usuarioId)
                .OrderByDescending(h => h.Fecha)
                .ToListAsync();

            return Ok(historial);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PostPrediccion(
            [FromBody] HistorialPredictivo prediccion)
        {
            if (prediccion == null ||
                prediccion.UsuarioId <= 0)
                return BadRequest("Datos inválidos");

            var existeUsuario =
                await _context.Usuarios
                .AnyAsync(u => u.Id == prediccion.UsuarioId);

            if (!existeUsuario)
                return NotFound("Usuario no encontrado");

            prediccion.Fecha = DateTime.UtcNow;
            prediccion.NivelRiesgo ??= "";
            prediccion.Origen ??= "Manual";

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
