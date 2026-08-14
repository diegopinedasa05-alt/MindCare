namespace AppTesisAPI.Models;

public class CitaHistorialEstado
{
    public long Id { get; set; }

    public int CitaId { get; set; }

    public string EstadoAnterior { get; set; } = "";

    public string EstadoNuevo { get; set; } = "";

    public int CambiadoPorUsuarioId { get; set; }

    public DateTime FechaUtc { get; set; } = DateTime.UtcNow;

    public string Detalle { get; set; } = "";
}
