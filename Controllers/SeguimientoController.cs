using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;
using AppTesisAPI.Services;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SeguimientoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SeguimientoController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("usuario/{usuarioId}")]
        public async Task<IActionResult> PorUsuario(int usuarioId)
        {
            if (!await PuedeLeer(usuarioId))
                return Forbid();

            var datos =
                await _context.SeguimientosUsuario
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .Take(30)
                .Select(x => new
                {
                    x.Id,
                    x.UsuarioId,
                    x.Fecha,
                    x.TareasCompletadas,
                    x.TotalTareas,
                    progreso =
                        x.TotalTareas <= 0
                            ? 0
                            : Math.Round(
                                (double)x.TareasCompletadas / x.TotalTareas * 100,
                                0),
                    x.Respuesta1,
                    x.Respuesta2,
                    x.Respuesta3,
                    x.AccionPrincipal,
                    x.NivelRiesgo,
                    x.FechaActualizacion
                })
                .ToListAsync();

            return Ok(datos);
        }

        [HttpGet("usuario/{usuarioId}/hoy")]
        public async Task<IActionResult> Hoy(int usuarioId)
        {
            if (!await PuedeLeer(usuarioId))
                return Forbid();

            var hoy = DateTime.UtcNow.Date;

            var seguimiento =
                await _context.SeguimientosUsuario
                .Where(x =>
                    x.UsuarioId == usuarioId &&
                    x.Fecha == hoy)
                .FirstOrDefaultAsync();

            if (seguimiento == null)
                return Ok(new { existe = false });

            return Ok(new
            {
                existe = true,
                seguimiento.Id,
                seguimiento.UsuarioId,
                seguimiento.Fecha,
                seguimiento.TareasCompletadas,
                seguimiento.TotalTareas,
                progreso =
                    seguimiento.TotalTareas <= 0
                        ? 0
                        : Math.Round(
                            (double)seguimiento.TareasCompletadas /
                            seguimiento.TotalTareas * 100,
                            0),
                seguimiento.Respuesta1,
                seguimiento.Respuesta2,
                seguimiento.Respuesta3,
                seguimiento.AccionPrincipal,
                seguimiento.NivelRiesgo,
                seguimiento.FechaActualizacion
            });
        }

        [HttpPost("usuario/{usuarioId}")]
        public async Task<IActionResult> Guardar(
            int usuarioId,
            [FromBody] SeguimientoUsuarioRequest request)
        {
            var currentUserId = User.GetUserId();

            if (currentUserId == null ||
                (!User.IsAdmin() && currentUserId != usuarioId))
            {
                return Forbid();
            }

            if (request == null)
                return BadRequest("Datos inválidos.");

            var fecha =
                (request.Fecha ?? DateTime.UtcNow).ToUniversalTime().Date;

            var totalTareas =
                request.TotalTareas <= 0
                    ? 1
                    : request.TotalTareas;

            var completadas =
                Math.Clamp(
                    request.TareasCompletadas,
                    0,
                    totalTareas);

            var seguimiento =
                await _context.SeguimientosUsuario
                .FirstOrDefaultAsync(x =>
                    x.UsuarioId == usuarioId &&
                    x.Fecha == fecha);

            if (seguimiento == null)
            {
                seguimiento =
                    new SeguimientoUsuario
                    {
                        UsuarioId = usuarioId,
                        Fecha = fecha
                    };

                _context.SeguimientosUsuario.Add(seguimiento);
            }

            seguimiento.TareasCompletadas = completadas;
            seguimiento.TotalTareas = totalTareas;
            seguimiento.Respuesta1 = request.Respuesta1?.Trim() ?? "";
            seguimiento.Respuesta2 = request.Respuesta2?.Trim() ?? "";
            seguimiento.Respuesta3 = request.Respuesta3?.Trim() ?? "";
            seguimiento.AccionPrincipal =
                request.AccionPrincipal?.Trim() ?? "";
            seguimiento.NivelRiesgo =
                request.NivelRiesgo?.Trim() ?? "";
            seguimiento.FechaActualizacion = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Seguimiento guardado.",
                seguimiento.Id,
                progreso =
                    Math.Round(
                        (double)seguimiento.TareasCompletadas /
                        seguimiento.TotalTareas * 100,
                        0)
            });
        }

        private async Task<bool> PuedeLeer(int usuarioId)
        {
            var currentUserId = User.GetUserId();

            if (User.IsAdmin() || currentUserId == usuarioId)
                return true;

            if (!User.IsPsicologo() || currentUserId == null)
                return false;

            return await _context.PacientePsicologos
                .AnyAsync(x =>
                    x.PacienteId == usuarioId &&
                    x.PsicologoId == currentUserId.Value &&
                    x.Activo);
        }
    }
}
