namespace AppTesisAPI.Models;

public class AuditoriaEvento
{
    public long Id { get; set; }

    public int? UsuarioId { get; set; }

    public string Accion { get; set; } = "";

    public string Entidad { get; set; } = "";

    public string EntidadId { get; set; } = "";

    public DateTime FechaUtc { get; set; } = DateTime.UtcNow;

    public string Resultado { get; set; } = "";

    public string Ip { get; set; } = "";

    public string CorrelationId { get; set; } = "";

    public string Detalles { get; set; } = "";
}
