using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Services;

namespace AppTesisAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class IAController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAService _iaService;
        private readonly IPatientAccessService _patientAccess;
        private readonly IPsychologistVerificationService _verification;

        public IAController(
            AppDbContext context,
            IAService iaService,
            IPatientAccessService patientAccess,
            IPsychologistVerificationService verification)
        {
            _context = context;
            _iaService = iaService;
            _patientAccess = patientAccess;
            _verification = verification;
        }

        [HttpGet("{usuarioId}")]
        public async Task<IActionResult> Analizar(int usuarioId)
        {
            if (!await _patientAccess.CanReadAsync(User, usuarioId))
                return Forbid();

            var resultado =
                await AnalizarUsuario(usuarioId);

            return Ok(resultado);
        }

        [HttpGet("admin/alertas")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AlertasGlobales()
        {
            var usuarios =
                await _context.Credenciales
                .Where(c =>
                    c.Rol == "Usuario" &&
                    c.Activo)
                .Join(
                    _context.Usuarios,
                    c => c.UsuarioId,
                    u => u.Id,
                    (c, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        c.Email,
                        u.Zona
                    })
                .ToListAsync();

            var resultado =
                new List<object>();

            foreach (var usuario in usuarios)
            {
                resultado.Add(new
                {
                    usuarioId = usuario.Id,
                    usuario.Nombre,
                    usuario.Email,
                    usuario.Zona,
                    analisis = await AnalizarUsuario(usuario.Id)
                });
            }

            return Ok(resultado);
        }

        [HttpGet("psicologo/pacientes")]
        [Authorize(Roles = "Psicologo,Admin")]
        public async Task<IActionResult> AlertasPacientesAsignados()
        {
            if (User.IsPsicologo() &&
                !await _verification.CanProvideClinicalCareAsync(User))
                return Forbid();

            var psicologoId =
                User.GetUserId();

            if (psicologoId == null)
                return Forbid();

            var pacientes =
                await _context.PacientePsicologos
                .Where(x =>
                    x.PsicologoId == psicologoId &&
                    x.Activo)
                .Join(
                    _context.Usuarios,
                    a => a.PacienteId,
                    u => u.Id,
                    (a, u) => new
                    {
                        u.Id,
                        u.Nombre,
                        u.Zona
                    })
                .ToListAsync();

            var resultado =
                new List<object>();

            foreach (var paciente in pacientes)
            {
                resultado.Add(new
                {
                    pacienteId = paciente.Id,
                    paciente.Nombre,
                    paciente.Zona,
                    analisis = await AnalizarUsuario(paciente.Id)
                });
            }

            return Ok(resultado);
        }

        private async Task<object> AnalizarUsuario(int usuarioId)
        {
            var ultimoPHQ9 =
                await _context.TestPHQ9
                .Where(t => t.UsuarioId == usuarioId)
                .OrderByDescending(t => t.Fecha)
                .FirstOrDefaultAsync();

            var ultimoEstresLaboral =
                await _context.TestEstresLaboral
                .Where(t => t.UsuarioId == usuarioId)
                .OrderByDescending(t => t.Fecha)
                .FirstOrDefaultAsync();

            var ultimoRegistro =
                await _context.RegistrosEmocionales
                .Where(r => r.UsuarioId == usuarioId)
                .OrderByDescending(r => r.Fecha)
                .FirstOrDefaultAsync();

            var desde =
                DateTime.UtcNow.AddDays(-14);

            var registrosRecientes =
                await _context.RegistrosEmocionales
                .Where(r =>
                    r.UsuarioId == usuarioId &&
                    r.Fecha >= desde)
                .OrderBy(r => r.Fecha)
                .ToListAsync();

            var resultado =
                _iaService.Evaluar(
                    ultimoPHQ9,
                    ultimoEstresLaboral,
                    ultimoRegistro,
                    registrosRecientes);

            return resultado;
        }
    }
}
