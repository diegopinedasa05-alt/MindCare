using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using AppTesisAPI.Models;
using AppTesisAPI.Services;

namespace AppTesisAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CitasController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPatientAccessService _patientAccess;
    private readonly IPsychologistVerificationService _verification;

    public CitasController(
        AppDbContext context,
        IPatientAccessService patientAccess,
        IPsychologistVerificationService verification)
    {
        _context = context;
        _patientAccess = patientAccess;
        _verification = verification;
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] Cita cita)
    {
        if (cita is null)
            return BadRequest("Datos vacios.");

        if (cita.UsuarioId <= 0 || cita.PsicologoId <= 0)
            return BadRequest("Paciente o psicologo invalido.");

        if (cita.Fecha == default)
            return BadRequest("Fecha invalida.");

        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        if (User.IsPsicologo() &&
            !await _verification.CanProvideClinicalCareAsync(User))
        {
            return Forbid();
        }

        var permitido =
            User.IsAdmin() ||
            (User.IsPsicologo() && currentUserId == cita.PsicologoId);

        if (!permitido)
            return Forbid();

        if (!await _context.Usuarios.AnyAsync(x => x.Id == cita.UsuarioId))
            return BadRequest("Paciente no encontrado.");

        var existePsicologo = await _context.Credenciales.AnyAsync(x =>
            x.UsuarioId == cita.PsicologoId &&
            x.Rol == "Psicologo" &&
            x.Activo);

        if (!existePsicologo)
            return BadRequest("Psicologo no encontrado.");

        cita.Fecha = NormalizarFecha(cita.Fecha);
        if (cita.Fecha <= DateTime.UtcNow)
            return BadRequest("La cita debe programarse en una fecha futura.");

        if (await ExisteConflictoAsync(cita.PsicologoId, cita.Fecha))
            return Conflict("El psicologo ya tiene una cita en ese horario.");

        var ahora = DateTime.UtcNow;
        cita.Estado = CitaWorkflow.Pendiente;
        cita.Observacion = (cita.Observacion ?? "").Trim();
        cita.FechaCreacion = ahora;
        cita.FechaEstadoUtc = ahora;
        cita.EstadoActualizadoPorUsuarioId = currentUserId;

        // Neon uses connection retries, so explicit transactions must run
        // through EF Core's execution strategy to preserve atomicity.
        var executionStrategy = _context.Database.CreateExecutionStrategy();
        await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.Citas.Add(cita);

            var asignacion = await _context.PacientePsicologos.FirstOrDefaultAsync(x =>
                x.PacienteId == cita.UsuarioId &&
                x.PsicologoId == cita.PsicologoId);

            if (asignacion is null)
            {
                _context.PacientePsicologos.Add(new PacientePsicologo
                {
                    PacienteId = cita.UsuarioId,
                    PsicologoId = cita.PsicologoId,
                    FechaAsignacion = ahora,
                    Activo = true
                });
            }
            else if (!asignacion.Activo)
            {
                asignacion.Activo = true;
                asignacion.FechaAsignacion = ahora;
            }

            await _context.SaveChangesAsync();

            RegistrarCambioEstado(
                cita,
                "",
                CitaWorkflow.Pendiente,
                currentUserId.Value,
                "Cita programada",
                ahora);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        });

        return Ok(new
        {
            mensaje = "Cita creada.",
            cita.Id,
            cita.Estado,
            cita.Fecha
        });
    }

    [HttpGet("usuario/{id:int}")]
    public async Task<IActionResult> Usuario(int id)
    {
        if (!await _patientAccess.CanReadAsync(User, id))
            return Forbid();

        var citas = _context.Citas.Where(x => x.UsuarioId == id);

        if (User.IsPsicologo())
        {
            var psicologoId = User.GetUserId();
            citas = citas.Where(x => x.PsicologoId == psicologoId);
        }

        var lista = await citas
            .OrderByDescending(x => x.Fecha)
            .Select(x => new
            {
                x.Id,
                x.UsuarioId,
                x.PsicologoId,
                x.Fecha,
                x.Estado,
                x.Observacion,
                x.FechaAtencionUtc,
                x.FechaEstadoUtc,
                x.EstadoActualizadoPorUsuarioId,
                nombrePsicologo = _context.Usuarios
                    .Where(u => u.Id == x.PsicologoId)
                    .Select(u => u.Nombre)
                    .FirstOrDefault(),
                actualizadoPor = _context.Usuarios
                    .Where(u => u.Id == x.EstadoActualizadoPorUsuarioId)
                    .Select(u => u.Nombre)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("psicologo/{id:int}")]
    public async Task<IActionResult> Psicologo(int id)
    {
        if (!User.IsAdmin() && User.GetUserId() != id)
            return Forbid();

        if (User.IsPsicologo() &&
            !await _verification.CanProvideClinicalCareAsync(User))
        {
            return Forbid();
        }

        var lista = await _context.Citas
            .Where(x => x.PsicologoId == id)
            .OrderByDescending(x => x.Fecha)
            .Select(x => new
            {
                x.Id,
                x.UsuarioId,
                x.PsicologoId,
                x.Fecha,
                x.Estado,
                x.Observacion,
                x.FechaAtencionUtc,
                x.FechaEstadoUtc,
                x.EstadoActualizadoPorUsuarioId,
                nombrePaciente = _context.Usuarios
                    .Where(u => u.Id == x.UsuarioId)
                    .Select(u => u.Nombre)
                    .FirstOrDefault(),
                actualizadoPor = _context.Usuarios
                    .Where(u => u.Id == x.EstadoActualizadoPorUsuarioId)
                    .Select(u => u.Nombre)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpPut("{id:int}/estado")]
    public async Task<IActionResult> ActualizarEstado(
        int id,
        [FromBody] ActualizarEstadoCitaRequest request)
    {
        var cita = await _context.Citas.FindAsync(id);
        if (cita is null)
            return NotFound("Cita no encontrada.");

        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        if (!User.IsAdmin() &&
            (!User.IsPsicologo() || currentUserId != cita.PsicologoId))
        {
            return Forbid();
        }

        if (User.IsPsicologo() &&
            !await _verification.CanProvideClinicalCareAsync(User))
        {
            return Forbid();
        }

        var nuevoEstado = CitaWorkflow.Normalizar(request.Estado);
        if (nuevoEstado is null ||
            nuevoEstado is CitaWorkflow.Pendiente or CitaWorkflow.Atendida)
        {
            return BadRequest("Estado no permitido. Usa Confirmada, No asistio o Cancelada.");
        }

        var estadoAnterior = CitaWorkflow.Normalizar(cita.Estado) ?? CitaWorkflow.Pendiente;
        if (!CitaWorkflow.PuedeCambiar(estadoAnterior, nuevoEstado))
        {
            return Conflict($"No se puede cambiar una cita de {estadoAnterior} a {nuevoEstado}.");
        }

        if (nuevoEstado == CitaWorkflow.NoAsistio &&
            NormalizarFecha(cita.Fecha) > DateTime.UtcNow.AddMinutes(15))
        {
            return BadRequest("La inasistencia solo puede registrarse al iniciar o despues de la cita.");
        }

        var ahora = DateTime.UtcNow;
        AplicarEstado(cita, nuevoEstado, currentUserId.Value, ahora);
        RegistrarCambioEstado(
            cita,
            estadoAnterior,
            nuevoEstado,
            currentUserId.Value,
            request.Detalle,
            ahora);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Estado actualizado.",
            cita.Id,
            cita.Estado,
            cita.FechaEstadoUtc,
            cita.EstadoActualizadoPorUsuarioId
        });
    }

    [HttpPost("{id:int}/finalizar")]
    public async Task<IActionResult> Finalizar(
        int id,
        [FromBody] FinalizarCitaRequest request)
    {
        var cita = await _context.Citas.FindAsync(id);
        if (cita is null)
            return NotFound("Cita no encontrada.");

        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        if (!User.IsPsicologo() || currentUserId != cita.PsicologoId)
            return Forbid();

        if (!await _verification.CanProvideClinicalCareAsync(User))
            return Forbid();

        var nota = (request.Nota ?? "").Trim();
        var planAccion = (request.PlanAccion ?? "").Trim();
        if (string.IsNullOrWhiteSpace(nota) || string.IsNullOrWhiteSpace(planAccion))
        {
            return BadRequest("La nota de atencion y el plan de accion son obligatorios.");
        }

        var estadoAnterior = CitaWorkflow.Normalizar(cita.Estado) ?? CitaWorkflow.Pendiente;
        if (CitaWorkflow.EsFinal(estadoAnterior))
            return Conflict($"La cita ya se encuentra en estado {estadoAnterior}.");

        if (NormalizarFecha(cita.Fecha) > DateTime.UtcNow.AddMinutes(30))
            return BadRequest("La atencion no puede finalizarse antes del horario de la cita.");

        DateTime? siguienteFecha = null;
        if (request.SiguienteCitaFecha.HasValue)
        {
            siguienteFecha = NormalizarFecha(request.SiguienteCitaFecha.Value);
            if (siguienteFecha <= DateTime.UtcNow)
                return BadRequest("La siguiente cita debe programarse en una fecha futura.");

            if (await ExisteConflictoAsync(cita.PsicologoId, siguienteFecha.Value))
                return Conflict("El psicologo ya tiene una cita en el horario seleccionado.");
        }

        var ahora = DateTime.UtcNow;
        Cita? siguienteCita = null;
        var executionStrategy = _context.Database.CreateExecutionStrategy();
        await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            AplicarEstado(cita, CitaWorkflow.Atendida, currentUserId.Value, ahora);
            cita.FechaAtencionUtc = ahora;

            _context.NotasSeguimiento.Add(new NotaSeguimiento
            {
                CitaId = cita.Id,
                PacienteId = cita.UsuarioId,
                PsicologoId = cita.PsicologoId,
                Nota = nota,
                PlanAccion = planAccion,
                Fecha = ahora
            });

            RegistrarCambioEstado(
                cita,
                estadoAnterior,
                CitaWorkflow.Atendida,
                currentUserId.Value,
                "Atencion finalizada con nota y plan de accion",
                ahora);

            if (siguienteFecha.HasValue)
            {
                siguienteCita = new Cita
                {
                    UsuarioId = cita.UsuarioId,
                    PsicologoId = cita.PsicologoId,
                    Fecha = siguienteFecha.Value,
                    Estado = CitaWorkflow.Pendiente,
                    Observacion = (request.SiguienteCitaObservacion ?? "").Trim(),
                    FechaCreacion = ahora,
                    FechaEstadoUtc = ahora,
                    EstadoActualizadoPorUsuarioId = currentUserId
                };

                _context.Citas.Add(siguienteCita);
            }

            await _context.SaveChangesAsync();

            if (siguienteCita is not null)
            {
                RegistrarCambioEstado(
                    siguienteCita,
                    "",
                    CitaWorkflow.Pendiente,
                    currentUserId.Value,
                    "Siguiente cita programada al finalizar la atencion",
                    ahora);

                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();
        });

        return Ok(new
        {
            mensaje = siguienteCita is null
                ? "Atencion finalizada."
                : "Atencion finalizada y siguiente cita programada.",
            cita.Id,
            cita.Estado,
            cita.FechaAtencionUtc,
            siguienteCitaId = siguienteCita?.Id,
            siguienteCitaFecha = siguienteCita?.Fecha
        });
    }

    [HttpGet("{id:int}/historial")]
    public async Task<IActionResult> Historial(int id)
    {
        var cita = await _context.Citas
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (cita is null)
            return NotFound("Cita no encontrada.");

        var currentUserId = User.GetUserId();
        if (!User.IsAdmin() &&
            currentUserId != cita.UsuarioId &&
            currentUserId != cita.PsicologoId)
        {
            return Forbid();
        }

        var historial = await _context.CitaHistorialEstados
            .AsNoTracking()
            .Where(x => x.CitaId == id)
            .OrderByDescending(x => x.FechaUtc)
            .Select(x => new
            {
                x.Id,
                x.CitaId,
                x.EstadoAnterior,
                x.EstadoNuevo,
                x.CambiadoPorUsuarioId,
                cambiadoPor = _context.Usuarios
                    .Where(u => u.Id == x.CambiadoPorUsuarioId)
                    .Select(u => u.Nombre)
                    .FirstOrDefault(),
                x.FechaUtc,
                x.Detalle
            })
            .ToListAsync();

        return Ok(historial);
    }

    [HttpPut("cancelar/{id:int}")]
    public async Task<IActionResult> Cancelar(int id)
    {
        var cita = await _context.Citas.FindAsync(id);
        if (cita is null)
            return NotFound("Cita no encontrada.");

        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        if (!User.IsAdmin() &&
            currentUserId != cita.UsuarioId &&
            currentUserId != cita.PsicologoId)
        {
            return Forbid();
        }

        var estadoAnterior = CitaWorkflow.Normalizar(cita.Estado) ?? CitaWorkflow.Pendiente;
        if (!CitaWorkflow.PuedeCambiar(estadoAnterior, CitaWorkflow.Cancelada))
            return Conflict($"La cita no puede cancelarse porque esta {estadoAnterior}.");

        var ahora = DateTime.UtcNow;
        AplicarEstado(cita, CitaWorkflow.Cancelada, currentUserId.Value, ahora);
        RegistrarCambioEstado(
            cita,
            estadoAnterior,
            CitaWorkflow.Cancelada,
            currentUserId.Value,
            User.IsPsicologo() ? "Cancelada por el profesional" : "Cancelada por el usuario",
            ahora);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Cita cancelada.",
            cita.Id,
            cita.Estado,
            cita.FechaEstadoUtc
        });
    }

    private Task<bool> ExisteConflictoAsync(
        int psicologoId,
        DateTime fecha,
        int? excluirCitaId = null)
    {
        return _context.Citas.AnyAsync(x =>
            x.PsicologoId == psicologoId &&
            x.Fecha == fecha &&
            x.Id != excluirCitaId &&
            x.Estado != CitaWorkflow.Cancelada);
    }

    private static DateTime NormalizarFecha(DateTime fecha)
    {
        return fecha.Kind switch
        {
            DateTimeKind.Utc => fecha,
            DateTimeKind.Local => fecha.ToUniversalTime(),
            _ => DateTime.SpecifyKind(fecha, DateTimeKind.Utc)
        };
    }

    private static void AplicarEstado(
        Cita cita,
        string estado,
        int usuarioId,
        DateTime fechaUtc)
    {
        cita.Estado = estado;
        cita.FechaEstadoUtc = fechaUtc;
        cita.EstadoActualizadoPorUsuarioId = usuarioId;
    }

    private void RegistrarCambioEstado(
        Cita cita,
        string estadoAnterior,
        string estadoNuevo,
        int usuarioId,
        string? detalle,
        DateTime fechaUtc)
    {
        var detalleSeguro = (detalle ?? "").Trim();

        _context.CitaHistorialEstados.Add(new CitaHistorialEstado
        {
            CitaId = cita.Id,
            EstadoAnterior = estadoAnterior,
            EstadoNuevo = estadoNuevo,
            CambiadoPorUsuarioId = usuarioId,
            FechaUtc = fechaUtc,
            Detalle = detalleSeguro
        });

        _context.AuditoriaEventos.Add(new AuditoriaEvento
        {
            UsuarioId = usuarioId,
            Accion = "CAMBIO_ESTADO_CITA",
            Entidad = "Cita",
            EntidadId = cita.Id.ToString(),
            FechaUtc = fechaUtc,
            Resultado = estadoNuevo,
            Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "",
            CorrelationId = HttpContext.TraceIdentifier,
            Detalles = $"{estadoAnterior} -> {estadoNuevo}. {detalleSeguro}".Trim()
        });
    }
}
