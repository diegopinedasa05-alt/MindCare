namespace AppTesisAPI.Models;

public class PerfilPsicologo
{
    public int Id { get; set; }

    public int UsuarioId { get; set; }

    public string ApellidoPaterno { get; set; } = "";

    public string ApellidoMaterno { get; set; } = "";

    public string NumeroCedula { get; set; } = "";

    public string Institucion { get; set; } = "";

    public string Especialidad { get; set; } = "";

    public int? AniosExperiencia { get; set; }

    public string FotoStorageKey { get; set; } = "";

    public string EstadoVerificacion { get; set; } = "Pendiente";

    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;

    public DateTime? FechaVerificacion { get; set; }

    public bool Activo { get; set; } = true;

    public string Observaciones { get; set; } = "";
}
