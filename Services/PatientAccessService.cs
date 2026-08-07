using System.Security.Claims;
using AppTesisAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace AppTesisAPI.Services;

public interface IPatientAccessService
{
    Task<bool> CanReadAsync(ClaimsPrincipal principal, int patientId);
}

public sealed class PatientAccessService : IPatientAccessService
{
    private readonly AppDbContext _context;
    private readonly IPsychologistVerificationService _verification;

    public PatientAccessService(
        AppDbContext context,
        IPsychologistVerificationService verification)
    {
        _context = context;
        _verification = verification;
    }

    public async Task<bool> CanReadAsync(
        ClaimsPrincipal principal,
        int patientId)
    {
        var currentUserId = principal.GetUserId();

        if (currentUserId is null || patientId <= 0)
            return false;

        if (principal.IsAdmin() || currentUserId.Value == patientId)
            return true;

        if (!principal.IsPsicologo())
            return false;

        if (!await _verification.CanProvideClinicalCareAsync(principal))
            return false;

        return await _context.PacientePsicologos.AnyAsync(x =>
            x.PacienteId == patientId &&
            x.PsicologoId == currentUserId.Value &&
            x.Activo);
    }
}
