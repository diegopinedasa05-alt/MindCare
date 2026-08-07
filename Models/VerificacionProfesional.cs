namespace AppTesisAPI.Models;

public class VerificacionProfesional
{
    public int Id { get; set; }

    public int PerfilPsicologoId { get; set; }

    public int? DocumentoProfesionalId { get; set; }

    public int AdministradorId { get; set; }

    public string EstadoAnterior { get; set; } = "";

    public string EstadoNuevo { get; set; } = "";

    public string Observacion { get; set; } = "";

    public DateTime FechaUtc { get; set; } = DateTime.UtcNow;
}
