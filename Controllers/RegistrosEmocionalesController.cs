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
    public class RegistrosEmocionalesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPatientAccessService _patientAccess;

        public RegistrosEmocionalesController(
            AppDbContext context,
            IPatientAccessService patientAccess)
        {
            _context = context;
            _patientAccess = patientAccess;
        }

        [HttpPost]
        public async Task<IActionResult> Crear(
            [FromBody] RegistrosEmocionales registro)
        {
            try
            {
                if (registro == null ||
                    registro.UsuarioId <= 0)
                    return BadRequest("Datos inválidos");

                if (!User.IsAdmin() &&
                    User.GetUserId() != registro.UsuarioId)
                    return Forbid();

                var existeUsuario =
                    await _context.Usuarios
                    .AnyAsync(x =>
                        x.Id == registro.UsuarioId);

                if (!existeUsuario)
                    return NotFound("Usuario no encontrado");

                if (registro.NivelAnimo < 0 ||
                    registro.NivelAnimo > 10 ||
                    registro.NivelEstres < 0 ||
                    registro.NivelEstres > 10)
                    return BadRequest(
                        "Los niveles deben estar entre 0 y 10");

                registro.Fecha = DateTime.UtcNow;
                registro.Nota ??= "";
                registro.Categoria ??= "";

                _context.RegistrosEmocionales.Add(registro);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    mensaje =
                        "Registro emocional guardado correctamente"
                });
            }
            catch
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    "No se pudo guardar el registro emocional.");
            }
        }

        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> Get(int usuarioId)
        {
            if (!await _patientAccess.CanReadAsync(User, usuarioId))
                return Forbid();

            var datos =
                await _context.RegistrosEmocionales
                .Where(x => x.UsuarioId == usuarioId)
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            return Ok(datos);
        }

        [HttpGet("promedio/{usuarioId}")]
        public async Task<IActionResult> GetPromedio(int usuarioId)
        {
            if (!await _patientAccess.CanReadAsync(User, usuarioId))
                return Forbid();

            var registros =
                await _context.RegistrosEmocionales
                .Where(x => x.UsuarioId == usuarioId)
                .ToListAsync();

            if (!registros.Any())
            {
                return Ok(new
                {
                    mensaje = "Sin datos"
                });
            }

            return Ok(new
            {
                promedioAnimo =
                    registros.Average(x => x.NivelAnimo),
                promedioEstres =
                    registros.Average(x => x.NivelEstres)
            });
        }

    }
}
