using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    /// <summary>
    /// Controlador encargado de la gestión de citas entre usuarios y psicólogos.
    /// Permite crear, consultar y administrar citas del sistema.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class CitasController : ControllerBase
    {
        private readonly AppDbContext _context;

        /// <summary>
        /// Constructor que inicializa el contexto de base de datos.
        /// </summary>
        /// <param name="context">Contexto de la base de datos</param>
        public CitasController(AppDbContext context)
        {
            _context = context;
        }

        // ===============================
        // CREAR CITA
        // ===============================

        /// <summary>
        /// Crea una nueva cita validando disponibilidad del psicólogo.
        /// </summary>
        /// <param name="cita">Objeto cita con datos del usuario y psicólogo</param>
        /// <returns>Mensaje de éxito o error</returns>
        [HttpPost]
        public async Task<IActionResult> CrearCita([FromBody] Cita cita)
        {
            // Validación básica
            if (cita == null ||
                cita.UsuarioId <= 0 ||
                cita.PsicologoId <= 0 ||
                cita.Fecha == default)
            {
                return BadRequest("Datos de cita inválidos");
            }

            // Validar existencia de usuario
            var existeUsuario = await _context.Usuarios
                .AnyAsync(u => u.Id == cita.UsuarioId);

            if (!existeUsuario)
                return NotFound("Usuario no encontrado");

            // Validar existencia de psicólogo
            var existePsicologo = await _context.Psicologos
                .AnyAsync(p => p.Id == cita.PsicologoId);

            if (!existePsicologo)
                return NotFound("Psicólogo no encontrado");

            // Validar disponibilidad (no duplicar fecha/hora)
            var ocupado = await _context.Citas.AnyAsync(c =>
                c.PsicologoId == cita.PsicologoId &&
                c.Fecha == cita.Fecha &&
                c.Estado != "Cancelada");

            if (ocupado)
                return BadRequest("Horario no disponible");

            // Estado inicial según diagrama
            cita.Estado = "Pendiente";

            _context.Citas.Add(cita);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Cita creada correctamente" });
        }

        // ===============================
        // OBTENER CITAS POR PSICÓLOGO
        // ===============================

        /// <summary>
        /// Obtiene todas las citas asociadas a un psicólogo,
        /// incluyendo el nombre del paciente.
        /// </summary>
        /// <param name="id">ID del psicólogo</param>
        /// <returns>Lista de citas</returns>
        [HttpGet("psicologo/{id}")]
        public async Task<IActionResult> GetCitasPorPsicologo(int id)
        {
            var citas = await _context.Citas
                .Where(c => c.PsicologoId == id)
                .Select(c => new
                {
                    c.Id,
                    c.Fecha,
                    c.Estado,
                    c.Observacion,
                    NombrePaciente = _context.Usuarios
                        .Where(u => u.Id == c.UsuarioId) // 🔥 CORREGIDO
                        .Select(u => u.Nombre)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(citas);
        }

        // ===============================
        // OBTENER CITAS POR USUARIO
        // ===============================

        /// <summary>
        /// Obtiene todas las citas de un usuario.
        /// </summary>
        /// <param name="usuarioId">ID del usuario</param>
        /// <returns>Lista de citas</returns>
        [HttpGet("usuario/{usuarioId}")]
        public async Task<IActionResult> GetCitasPorUsuario(int usuarioId)
        {
            var citas = await _context.Citas
                .Where(c => c.UsuarioId == usuarioId)
                .ToListAsync();

            return Ok(citas);
        }

        // ===============================
        // CANCELAR CITA
        // ===============================

        /// <summary>
        /// Permite cancelar una cita existente.
        /// </summary>
        /// <param name="id">ID de la cita</param>
        /// <returns>Mensaje de confirmación</returns>
        [HttpPut("cancelar/{id}")]
        public async Task<IActionResult> CancelarCita(int id)
        {
            var cita = await _context.Citas.FindAsync(id);

            if (cita == null)
                return NotFound("Cita no encontrada");

            cita.Estado = "Cancelada";

            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Cita cancelada correctamente" });
        }
    }
}