using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;

namespace AppTesisAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        /* =====================================
           RESUMEN GENERAL
        ===================================== */
        [HttpGet("resumen")]
        public async Task<IActionResult> Resumen()
        {
            var totalPsicologos =
                await _context.Usuarios
                .Join(
                    _context.Credenciales,
                    u => u.Id,
                    c => c.UsuarioId,
                    (u, c) => new { u, c }
                )
                .Where(x =>
                    x.c.Rol == "Psicologo")
                .CountAsync();

            return Ok(new
            {
                usuarios =
                    await _context.Usuarios.CountAsync(),

                psicologos =
                    totalPsicologos,

                citas =
                    await _context.Citas.CountAsync(),

                tests =
                    await _context.TestPHQ9.CountAsync(),

                registros =
                    await _context.RegistrosEmocionales.CountAsync(),

                riesgoAlto =
                    await _context.HistorialPredictivo
                    .Where(x =>
                        x.NivelRiesgo == "Alto" ||
                        x.NivelRiesgo == "Severo")
                    .CountAsync()
            });
        }

        /* =====================================
           USUARIOS RECIENTES
        ===================================== */
        [HttpGet("usuarios-recientes")]
        public async Task<IActionResult> UsuariosRecientes()
        {
            var lista =
                await _context.Usuarios
                .OrderByDescending(x =>
                    x.FechaRegistro)
                .Take(10)
                .Select(x => new
                {
                    id = x.Id,
                    nombre = x.Nombre,
                    fecha = x.FechaRegistro,
                    zona = x.Zona
                })
                .ToListAsync();

            return Ok(lista);
        }

        /* =====================================
           LISTA PSICOLOGOS
        ===================================== */
        [HttpGet("psicologos")]
        public async Task<IActionResult> Psicologos()
        {
            var lista =
                await _context.Usuarios
                .Join(
                    _context.Credenciales,
                    u => u.Id,
                    c => c.UsuarioId,
                    (u, c) => new { u, c }
                )
                .Where(x =>
                    x.c.Rol == "Psicologo")
                .Select(x => new
                {
                    id = x.u.Id,
                    nombre = x.u.Nombre,
                    zona = x.u.Zona,
                    especialidad =
                        x.u.Especialidad
                })
                .ToListAsync();

            return Ok(lista);
        }

        /* =====================================
           REGISTRAR PSICOLOGO
        ===================================== */
        [HttpPost("registrar-psicologo")]
        public async Task<IActionResult>
        RegistrarPsicologo(
        [FromBody] RegisterRequest model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Nombre) ||
                    string.IsNullOrWhiteSpace(model.Email) ||
                    string.IsNullOrWhiteSpace(model.Password))
                {
                    return BadRequest(
                        "Completa campos obligatorios");
                }

                bool existe =
                    await _context.Credenciales
                    .AnyAsync(x =>
                        x.Email ==
                        model.Email);

                if (existe)
                    return BadRequest(
                        "Correo ya registrado");

                var usuario =
                    new Usuario
                    {
                        Nombre =
                            model.Nombre,

                        Telefono =
                            model.Telefono,

                        Zona =
                            model.Zona,

                        Especialidad =
                            model.Especialidad,

                        FechaRegistro =
                            DateTime.Now
                    };

                _context.Usuarios.Add(usuario);

                await _context.SaveChangesAsync();

                var cred =
                    new Credenciales
                    {
                        Email =
                            model.Email,

                        PasswordHash =
                            model.Password,

                        UsuarioId =
                            usuario.Id,

                        Rol =
                            "Psicologo"
                    };

                _context.Credenciales.Add(cred);

                await _context.SaveChangesAsync();

                return Ok(
                    "Psicólogo creado correctamente");
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.Message);
            }
        }

        /* =====================================
           ELIMINAR PSICOLOGO
        ===================================== */
        [HttpDelete("eliminar-psicologo/{id}")]
        public async Task<IActionResult>
        EliminarPsicologo(int id)
        {
            try
            {
                var credencial =
                    await _context.Credenciales
                    .FirstOrDefaultAsync(x =>
                        x.UsuarioId == id &&
                        x.Rol == "Psicologo");

                var usuario =
                    await _context.Usuarios
                    .FirstOrDefaultAsync(x =>
                        x.Id == id);

                if (usuario == null)
                    return NotFound(
                        "No existe");

                if (credencial != null)
                    _context.Credenciales.Remove(credencial);

                _context.Usuarios.Remove(usuario);

                await _context.SaveChangesAsync();

                return Ok(
                    "Psicólogo eliminado");
            }
            catch (Exception ex)
            {
                return BadRequest(
                    ex.Message);
            }
        }
    }
}