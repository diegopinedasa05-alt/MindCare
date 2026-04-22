using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsuariosController(AppDbContext context)
        {
            _context = context;
        }

        /* =========================================
           PACIENTES
           api/Usuarios/pacientes
        ========================================= */
        [HttpGet("pacientes")]
        public async Task<IActionResult> GetPacientes()
        {
            var pacientes =
                await _context.Credenciales
                .Where(c =>
                    c.Rol == "Usuario"
                )
                .Join(
                    _context.Usuarios,
                    c => c.UsuarioId,
                    u => u.Id,
                    (c, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        u.Telefono,
                        u.Zona,
                        c.Email
                    })
                .OrderBy(x =>
                    x.Nombre
                )
                .ToListAsync();

            return Ok(pacientes);
        }

        /* =========================================
           PSICÓLOGOS
           api/Usuarios/psicologos
        ========================================= */
        [HttpGet("psicologos")]
        public async Task<IActionResult> GetPsicologos()
        {
            var psicologos =
                await _context.Credenciales
                .Where(c =>
                    c.Rol == "Psicologo"
                )
                .Join(
                    _context.Usuarios,
                    c => c.UsuarioId,
                    u => u.Id,
                    (c, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        u.Telefono,
                        u.Zona,
                        u.Especialidad,
                        c.Email
                    })
                .ToListAsync();

            return Ok(psicologos);
        }

        /* =========================================
           BUSCAR POR CORREO
           api/Usuarios/buscar-correo/test@mail.com
        ========================================= */
        [HttpGet("buscar-correo/{email}")]
        public async Task<IActionResult>
        BuscarPorCorreo(string email)
        {
            var usuario =
                await _context.Credenciales
                .Where(c =>
                    c.Email == email &&
                    c.Rol == "Usuario"
                )
                .Join(
                    _context.Usuarios,
                    c => c.UsuarioId,
                    u => u.Id,
                    (c, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        u.Telefono,
                        u.Zona,
                        c.Email
                    })
                .FirstOrDefaultAsync();

            if (usuario == null)
                return NotFound(
                    "Usuario no encontrado"
                );

            return Ok(usuario);
        }
    }
}