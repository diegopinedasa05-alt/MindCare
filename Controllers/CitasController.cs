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

        // CREAR CITA
        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] Cita cita)
        {
            if (cita == null)
                return BadRequest("Datos vacíos");

            cita.Estado = "Pendiente";
            cita.FechaCreacion = DateTime.Now;

            _context.Citas.Add(cita);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Cita creada"
            });
        }

        // CITAS DEL USUARIO
        [HttpGet("usuario/{id}")]
        public async Task<IActionResult> Usuario(int id)
        {
            var lista = await _context.Citas
                .Where(x => x.UsuarioId == id)
                .OrderBy(x => x.Fecha)
                .ToListAsync();

            return Ok(lista);
        }

        // CITAS DEL PSICÓLOGO
        [HttpGet("psicologo/{id}")]
        public async Task<IActionResult> Psicologo(int id)
        {
            var lista = await _context.Citas
                .Where(x => x.PsicologoId == id)
                .OrderBy(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.UsuarioId,
                    x.PsicologoId,
                    x.Fecha,
                    x.Estado,
                    x.Observacion,
                    nombrePaciente = _context.Usuarios
                        .Where(u => u.Id == x.UsuarioId)
                        .Select(u => u.Nombre)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(lista);
        }

        // CANCELAR
        [HttpPut("cancelar/{id}")]
        public async Task<IActionResult> Cancelar(int id)
        {
            var cita = await _context.Citas.FindAsync(id);

            if (cita == null)
                return NotFound();

            cita.Estado = "Cancelada";

            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}