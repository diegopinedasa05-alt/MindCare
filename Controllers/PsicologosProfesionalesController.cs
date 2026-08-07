using System.Net.Mail;
using System.Text.RegularExpressions;
using AppTesisAPI.Data;
using AppTesisAPI.Models;
using AppTesisAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace AppTesisAPI.Controllers;

[ApiController]
[Route("api/psicologos-profesionales")]
public class PsicologosProfesionalesController : ControllerBase
{
    private sealed class PerfilConUsuario
    {
        public PerfilPsicologo Perfil { get; init; } = null!;
        public Usuario Usuario { get; init; } = null!;
        public Credenciales Credencial { get; init; } = null!;
    }

    private static readonly HashSet<string> VerificationStates = new(
        StringComparer.OrdinalIgnoreCase)
    {
        "Pendiente",
        "EnRevision",
        "CorreccionRequerida",
        "Verificado",
        "Rechazado",
        "Suspendido"
    };

    private readonly AppDbContext _context;
    private readonly IProfessionalDocumentStorageService _storage;
    private readonly PasswordHasher<Credenciales> _passwordHasher = new();

    public PsicologosProfesionalesController(
        AppDbContext context,
        IProfessionalDocumentStorageService storage)
    {
        _context = context;
        _storage = storage;
    }

    [HttpPost("registro")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-register")]
    public async Task<IActionResult> Registrar(
        [FromBody] RegistroPsicologoRequest request)
    {
        if (!EsRegistroValido(request, out var validationError))
            return BadRequest(validationError);

        var email = request.Email.Trim().ToLowerInvariant();
        var cedula = request.NumeroCedula.Trim();

        var emailExists = await _context.Credenciales
            .AnyAsync(x => x.Email.ToLower() == email);
        var cedulaExists = await _context.PerfilesPsicologo
            .AnyAsync(x => x.NumeroCedula == cedula);

        if (emailExists || cedulaExists)
            return BadRequest("El correo o número de cédula ya está registrado.");

        var nombreCompleto = string.Join(" ", new[]
        {
            request.Nombre.Trim(),
            request.ApellidoPaterno.Trim(),
            request.ApellidoMaterno.Trim()
        });

        var usuario = new Usuario
        {
            Nombre = nombreCompleto,
            Telefono = request.Telefono.Trim(),
            Zona = request.Zona.Trim(),
            Especialidad = request.Especialidad.Trim(),
            FechaRegistro = DateTime.UtcNow
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        var credencial = new Credenciales
        {
            Email = email,
            UsuarioId = usuario.Id,
            Rol = "Psicologo",
            Activo = true
        };
        credencial.PasswordHash = _passwordHasher.HashPassword(
            credencial,
            request.Password);

        var perfil = new PerfilPsicologo
        {
            UsuarioId = usuario.Id,
            ApellidoPaterno = request.ApellidoPaterno.Trim(),
            ApellidoMaterno = request.ApellidoMaterno.Trim(),
            NumeroCedula = cedula,
            Institucion = request.Institucion.Trim(),
            Especialidad = request.Especialidad.Trim(),
            AniosExperiencia = request.AniosExperiencia,
            EstadoVerificacion = "Pendiente",
            FechaRegistro = DateTime.UtcNow,
            Activo = true
        };

        _context.Credenciales.Add(credencial);
        _context.PerfilesPsicologo.Add(perfil);
        _context.ConsentimientosUsuario.Add(new ConsentimientoUsuario
        {
            UsuarioId = usuario.Id,
            VersionDocumento = "MindCare-legal-v2",
            FechaAceptacion = DateTime.UtcNow,
            Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "",
            UserAgent = Request.Headers.UserAgent.ToString()
        });
        RegistrarAuditoria(
            usuario.Id,
            "RegistroProfesional",
            "PerfilPsicologo",
            usuario.Id.ToString(),
            "Exitoso");

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Registro profesional creado. Carga la cédula para iniciar la revisión.",
            estadoVerificacion = perfil.EstadoVerificacion
        });
    }

    [HttpGet("mi-perfil")]
    [Authorize(Roles = "Psicologo")]
    public async Task<IActionResult> MiPerfil()
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Forbid();

        var perfil = await PerfilConUsuarioQuery()
            .FirstOrDefaultAsync(x => x.Perfil.UsuarioId == userId.Value);

        if (perfil is null)
            return NotFound(new
            {
                mensaje = "Aún no existe un perfil profesional para esta cuenta."
            });

        var documentos = await _context.DocumentosProfesionales
            .Where(x => x.PerfilPsicologoId == perfil.Perfil.Id)
            .OrderByDescending(x => x.FechaCarga)
            .Select(x => new
            {
                x.Id,
                x.TipoDocumento,
                x.NombreOriginal,
                x.MimeType,
                x.SizeBytes,
                x.FechaCarga,
                x.Estado,
                x.Observaciones,
                x.MotivoRechazo
            })
            .ToListAsync();

        return Ok(new
        {
            perfil.Perfil.Id,
            perfil.Usuario.Nombre,
            perfil.Credencial.Email,
            perfil.Usuario.Telefono,
            perfil.Usuario.Zona,
            perfil.Perfil.NumeroCedula,
            perfil.Perfil.Institucion,
            perfil.Perfil.Especialidad,
            perfil.Perfil.AniosExperiencia,
            perfil.Perfil.EstadoVerificacion,
            perfil.Perfil.FechaRegistro,
            perfil.Perfil.FechaVerificacion,
            perfil.Perfil.Observaciones,
            documentos
        });
    }
[HttpPost("mi-perfil/documentos/cedula")]
[Authorize(Roles = "Psicologo")]
[EnableRateLimiting("professional-upload")]
[Consumes("multipart/form-data")]
public async Task<IActionResult> CargarCedula(
    IFormFile archivo,
    CancellationToken cancellationToken)
{
    var userId = User.GetUserId();

    if (userId is null)
        return Forbid();

    var perfil = await _context.PerfilesPsicologo
        .FirstOrDefaultAsync(
            x => x.UsuarioId == userId.Value,
            cancellationToken);

    if (perfil is null)
    {
        return NotFound(
            "No existe un perfil profesional para esta cuenta.");
    }

    StoredProfessionalDocument stored;

    try
    {
        stored = await _storage.UploadAsync(
            archivo,
            perfil.Id,
            cancellationToken);
    }
    catch (InvalidOperationException exception)
    {
        return BadRequest(exception.Message);
    }

    var document = new DocumentoProfesional
    {
        PerfilPsicologoId = perfil.Id,
        TipoDocumento = "CedulaProfesional",
        NumeroDocumento = perfil.NumeroCedula,
        StorageProvider = "Supabase",

        Bucket = stored.Bucket,
        StorageKey = stored.StorageKey,
        NombreOriginal = stored.OriginalFileName,
        MimeType = stored.MimeType,
        SizeBytes = stored.SizeBytes,
        HashSha256 = stored.HashSha256,

        FechaCarga = DateTime.UtcNow,
        Estado = "Pendiente"
    };

    perfil.EstadoVerificacion = "Pendiente";
    perfil.FechaVerificacion = null;

    _context.DocumentosProfesionales.Add(document);

    RegistrarAuditoria(
        userId,
        "CargaDocumentoProfesional",
        "DocumentoProfesional",
        perfil.Id.ToString(),
        "Exitoso");

    await _context.SaveChangesAsync(
        cancellationToken);

    return Ok(new
    {
        mensaje =
            "Documento cargado. El administrador realizará la revisión.",

        document.Id,
        perfil.EstadoVerificacion
    });
}

    [HttpGet("admin/pendientes")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Pendientes()
    {
        var perfiles = await PerfilConUsuarioQuery()
            .Where(x => x.Perfil.EstadoVerificacion != "Verificado")
            .OrderBy(x => x.Perfil.FechaRegistro)
            .Select(x => new
            {
                x.Perfil.Id,
                x.Usuario.Nombre,
                x.Credencial.Email,
                x.Usuario.Telefono,
                x.Perfil.NumeroCedula,
                x.Perfil.Institucion,
                x.Perfil.Especialidad,
                x.Perfil.AniosExperiencia,
                x.Perfil.EstadoVerificacion,
                x.Perfil.FechaRegistro,
                documentos = _context.DocumentosProfesionales
                    .Where(d => d.PerfilPsicologoId == x.Perfil.Id)
                    .OrderByDescending(d => d.FechaCarga)
                    .Select(d => new
                    {
                        d.Id,
                        d.TipoDocumento,
                        d.NombreOriginal,
                        d.FechaCarga,
                        d.Estado
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(perfiles);
    }

    [HttpPost("admin/{perfilId:int}/documentos/{documentoId:int}/url")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GenerarAccesoTemporal(
        int perfilId,
        int documentoId,
        CancellationToken cancellationToken)
    {
        var document = await _context.DocumentosProfesionales
            .FirstOrDefaultAsync(x =>
                x.Id == documentoId && x.PerfilPsicologoId == perfilId,
                cancellationToken);

        if (document is null)
            return NotFound("Documento no encontrado.");

        try
        {
            var url = await _storage.CreateSignedReadUrlAsync(
                document.Bucket,
                document.StorageKey,
                cancellationToken);
            RegistrarAuditoria(
                User.GetUserId(),
                "ConsultaDocumentoProfesional",
                "DocumentoProfesional",
                document.Id.ToString(),
                "Exitoso");
            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new { url, expiraEnSegundos = 300 });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(exception.Message);
        }
    }

    [HttpPatch("admin/{perfilId:int}/verificacion")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ActualizarVerificacion(
        int perfilId,
        [FromBody] ActualizarVerificacionProfesionalRequest request)
    {
        if (request is null || !VerificationStates.Contains(request.Estado.Trim()))
        {
            return BadRequest("Estado de verificación inválido.");
        }

        var perfil = await _context.PerfilesPsicologo.FindAsync(perfilId);
        if (perfil is null)
            return NotFound("Perfil profesional no encontrado.");

        var nuevoEstado = VerificationStates
            .First(x => x.Equals(request.Estado.Trim(), StringComparison.OrdinalIgnoreCase));
        var ultimoDocumento = await _context.DocumentosProfesionales
            .Where(x => x.PerfilPsicologoId == perfilId)
            .OrderByDescending(x => x.FechaCarga)
            .FirstOrDefaultAsync();

        if (nuevoEstado == "Verificado" && ultimoDocumento is null)
        {
            return BadRequest(
                "No se puede verificar un perfil sin documento profesional.");
        }

        var estadoAnterior = perfil.EstadoVerificacion;
        perfil.EstadoVerificacion = nuevoEstado;
        perfil.Observaciones = request.Observacion?.Trim() ?? "";
        perfil.FechaVerificacion = nuevoEstado == "Verificado"
            ? DateTime.UtcNow
            : null;
        perfil.Activo = nuevoEstado != "Suspendido";

        if (ultimoDocumento is not null)
        {
            ultimoDocumento.Estado = nuevoEstado;
            ultimoDocumento.RevisadoPorUsuarioId = User.GetUserId();
            ultimoDocumento.FechaRevision = DateTime.UtcNow;
            ultimoDocumento.Observaciones = perfil.Observaciones;
            ultimoDocumento.MotivoRechazo = nuevoEstado == "Rechazado"
                ? perfil.Observaciones
                : "";
        }

        _context.VerificacionesProfesionales.Add(new VerificacionProfesional
        {
            PerfilPsicologoId = perfil.Id,
            DocumentoProfesionalId = ultimoDocumento?.Id,
            AdministradorId = User.GetUserId()!.Value,
            EstadoAnterior = estadoAnterior,
            EstadoNuevo = nuevoEstado,
            Observacion = perfil.Observaciones,
            FechaUtc = DateTime.UtcNow
        });
        RegistrarAuditoria(
            User.GetUserId(),
            "CambioEstadoProfesional",
            "PerfilPsicologo",
            perfil.Id.ToString(),
            nuevoEstado);

        await _context.SaveChangesAsync();
        return Ok(new
        {
            mensaje = "Estado profesional actualizado.",
            estadoAnterior,
            estadoNuevo = nuevoEstado
        });
    }

    private IQueryable<PerfilConUsuario> PerfilConUsuarioQuery()
    {
        return _context.PerfilesPsicologo
            .Join(_context.Usuarios,
                perfil => perfil.UsuarioId,
                usuario => usuario.Id,
                (perfil, usuario) => new { perfil, usuario })
            .Join(_context.Credenciales,
                item => item.perfil.UsuarioId,
                credencial => credencial.UsuarioId,
                (item, credencial) => new PerfilConUsuario
                {
                    Perfil = item.perfil,
                    Usuario = item.usuario,
                    Credencial = credencial
                });
    }

    private void RegistrarAuditoria(
        int? usuarioId,
        string accion,
        string entidad,
        string entidadId,
        string resultado)
    {
        _context.AuditoriaEventos.Add(new AuditoriaEvento
        {
            UsuarioId = usuarioId,
            Accion = accion,
            Entidad = entidad,
            EntidadId = entidadId,
            FechaUtc = DateTime.UtcNow,
            Resultado = resultado,
            Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "",
            CorrelationId = HttpContext.TraceIdentifier,
            Detalles = ""
        });
    }

    private static bool EsRegistroValido(
        RegistroPsicologoRequest? request,
        out string error)
    {
        error = "";
        if (request is null ||
            string.IsNullOrWhiteSpace(request.Nombre) ||
            string.IsNullOrWhiteSpace(request.ApellidoPaterno) ||
            string.IsNullOrWhiteSpace(request.ApellidoMaterno) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Telefono) ||
            string.IsNullOrWhiteSpace(request.NumeroCedula) ||
            string.IsNullOrWhiteSpace(request.Institucion) ||
            string.IsNullOrWhiteSpace(request.Especialidad))
        {
            error = "Completa los datos profesionales obligatorios.";
            return false;
        }

        if (!request.AceptaTerminos)
        {
            error = "Debes aceptar los términos y el consentimiento informado.";
            return false;
        }

        if (request.Password?.Length < 10)
        {
            error = "La contraseña debe tener mínimo 10 caracteres.";
            return false;
        }

        if (request.AniosExperiencia is < 0 or > 80 ||
            !Regex.IsMatch(request.NumeroCedula.Trim(), "^\\d{5,12}$"))
        {
            error = "La cédula o los años de experiencia no son válidos.";
            return false;
        }

        try
        {
            var address = new MailAddress(request.Email.Trim());
            if (!address.Address.Equals(request.Email.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                error = "Correo inválido.";
                return false;
            }
        }
        catch
        {
            error = "Correo inválido.";
            return false;
        }

        return true;
    }
}
