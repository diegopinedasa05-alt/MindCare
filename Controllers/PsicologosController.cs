using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    /// <summary>
    /// Controlador encargado de la gestión de psicólogos.
    /// Permite listar, consultar y registrar psicólogos.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class PsicologosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PsicologosController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Obtiene todos los psicólogos.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetPsicologos()
        {
            var lista = await _context.Psicologos.ToListAsync();
            return Ok(lista);
        }

        /// <summary>
        /// Obtiene un psicólogo por ID.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPsicologo(int id)
        {
            var psicologo = await _context.Psicologos.FindAsync(id);

            if (psicologo == null)
                return NotFound("Psicólogo no encontrado");

            return Ok(psicologo);
        }

        /// <summary>
        /// Filtra psicólogos por zona.
        /// </summary>
        [HttpGet("zona/{zona}")]
        public async Task<IActionResult> GetPorZona(string zona)
        {
            var lista = await _context.Psicologos
                .Where(p => p.Zona == zona)
                .ToListAsync();

            return Ok(lista);
        }

        /// <summary>
        /// Registra un nuevo psicólogo.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CrearPsicologo([FromBody] Psicologo psicologo)
        {
            if (psicologo == null || string.IsNullOrWhiteSpace(psicologo.Nombre))
                return BadRequest("Datos inválidos");

            _context.Psicologos.Add(psicologo);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Psicólogo registrado correctamente" });
        }
    }
}