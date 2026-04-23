using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CitasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CitasController(AppDbContext context)
        {
            _context = context;
        }

        /* =====================================
           CREAR CITA
        ===================================== */
        [HttpPost]
        public async Task<IActionResult> CrearCita([FromBody] Cita cita)
        {
            try
            {
                if (cita == null ||
                    cita.UsuarioId <= 0 ||
                    cita.PsicologoId <= 0 ||
                    cita.Fecha == default)
                {
                    return BadRequest("Datos inválidos.");
                }

                bool existeUsuario =
                    await _context.Usuarios
                    .AnyAsync(x => x.Id == cita.UsuarioId);

                if (!existeUsuario)
                    return BadRequest("Usuario no existe.");

                bool existePsico =
                    await _context.Psicologos
                    .AnyAsync(x => x.Id == cita.PsicologoId);

                if (!existePsico)
                    return BadRequest("Psicólogo no existe.");

                bool ocupada =
                    await _context.Citas.AnyAsync(x =>
                        x.PsicologoId == cita.PsicologoId &&
                        x.Fecha == cita.Fecha &&
                        x.Estado != "Cancelada");

                if (ocupada)
                    return BadRequest("Horario ocupado.");

                cita.Estado = "Pendiente";
                cita.FechaCreacion = DateTime.UtcNow;

                _context.Citas.Add(cita);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    mensaje = "Cita creada correctamente"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.InnerException?.Message ??
                    ex.Message
                );
            }
        }

        /* =====================================
           CITAS DEL PSICÓLOGO
        ===================================== */
        [HttpGet("psicologo/{id}")]
        public async Task<IActionResult> GetPsicologo(int id)
        {
            var citas = await _context.Citas
                .Where(x => x.PsicologoId == id)
                .OrderByDescending(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.UsuarioId,
                    x.Fecha,
                    x.Estado,
                    x.Observacion,
                    NombrePaciente =
                        _context.Usuarios
                        .Where(u => u.Id == x.UsuarioId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(citas);
        }

        /* =====================================
           CITAS DEL USUARIO
        ===================================== */
        [HttpGet("usuario/{usuarioId}")]
        public async Task<IActionResult> GetUsuario(int usuarioId)
        {
            var citas = await _context.Citas
                .Where(x =>
                    x.UsuarioId == usuarioId &&
                    x.Estado != "Cancelada")
                .OrderByDescending(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.Fecha,
                    x.Estado,
                    x.Observacion,
                    x.PsicologoId
                })
                .ToListAsync();

            return Ok(citas);
        }

        /* =====================================
           CANCELAR
        ===================================== */
        [HttpPut("cancelar/{id}")]
        public async Task<IActionResult> Cancelar(int id)
        {
            var cita =
                await _context.Citas.FindAsync(id);

            if (cita == null)
                return NotFound("No existe.");

            cita.Estado = "Cancelada";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Cita cancelada"
            });
        }
    }
}