using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PsicologosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PsicologosController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetPsicologos()
        {
            var lista = await _context.Psicologos.ToListAsync();
            return Ok(lista);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPsicologo(int id)
        {
            var psicologo =
                await _context.Psicologos.FindAsync(id);

            if (psicologo == null)
                return NotFound("Psicólogo no encontrado");

            return Ok(psicologo);
        }

        [HttpGet("zona/{zona}")]
        public async Task<IActionResult> GetPorZona(string zona)
        {
            var lista =
                await _context.Psicologos
                .Where(p => p.Zona == zona)
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CrearPsicologo(
            [FromBody] Psicologo psicologo)
        {
            if (psicologo == null ||
                string.IsNullOrWhiteSpace(psicologo.Nombre))
                return BadRequest("Datos inválidos");

            psicologo.Nombre = psicologo.Nombre.Trim();
            psicologo.Especialidad ??= "";
            psicologo.Zona ??= "";
            psicologo.Telefono ??= "";

            _context.Psicologos.Add(psicologo);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Psicólogo registrado correctamente"
            });
        }
    }
}
