namespace AppTesisAPI.Models;

public class DocumentoProfesional
{
    public int Id { get; set; }

    public int PerfilPsicologoId { get; set; }

    public string TipoDocumento { get; set; } = "CedulaProfesional";

    public string NumeroDocumento { get; set; } = "";

    public string StorageProvider { get; set; } = "Supabase";

    public string Bucket { get; set; } = "";

    public string StorageKey { get; set; } = "";

    public string NombreOriginal { get; set; } = "";

    public string MimeType { get; set; } = "";

    public long SizeBytes { get; set; }

    public string HashSha256 { get; set; } = "";

    public DateTime FechaCarga { get; set; } = DateTime.UtcNow;

    public string Estado { get; set; } = "Pendiente";

    public int? RevisadoPorUsuarioId { get; set; }

    public DateTime? FechaRevision { get; set; }

    public string Observaciones { get; set; } = "";

    public string MotivoRechazo { get; set; } = "";
}
