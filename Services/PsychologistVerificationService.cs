using System.Security.Claims;
using AppTesisAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace AppTesisAPI.Services;

public interface IPsychologistVerificationService
{
    Task<bool> CanProvideClinicalCareAsync(ClaimsPrincipal principal);
}

public sealed class PsychologistVerificationService
    : IPsychologistVerificationService
{
    private readonly AppDbContext _context;

    public PsychologistVerificationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> CanProvideClinicalCareAsync(
        ClaimsPrincipal principal)
    {
        if (principal.IsAdmin())
            return true;

        if (!principal.IsPsicologo())
            return false;

        var psychologistId = principal.GetUserId();
        if (psychologistId is null)
            return false;

        var profile = await _context.PerfilesPsicologo
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UsuarioId == psychologistId.Value);

        // Compatibilidad temporal: perfiles creados antes de la verificaciÃ³n.
        // Los nuevos perfiles siempre deben contar con aprobaciÃ³n administrativa.
        return profile is null ||
               (profile.Activo &&
                string.Equals(
                    profile.EstadoVerificacion?.Trim(),
                    "Verificado",
                    StringComparison.OrdinalIgnoreCase));
    }
}
