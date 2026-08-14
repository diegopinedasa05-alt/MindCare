using System.ComponentModel.DataAnnotations;

namespace AppTesisAPI.Models;

public class ActualizarEstadoCitaRequest
{
    [Required]
    [MaxLength(30)]
    public string Estado { get; set; } = "";

    [MaxLength(500)]
    public string Detalle { get; set; } = "";
}

public class FinalizarCitaRequest
{
    [Required]
    [MaxLength(4000)]
    public string Nota { get; set; } = "";

    [Required]
    [MaxLength(4000)]
    public string PlanAccion { get; set; } = "";

    public DateTime? SiguienteCitaFecha { get; set; }

    [MaxLength(1000)]
    public string SiguienteCitaObservacion { get; set; } = "";
}
