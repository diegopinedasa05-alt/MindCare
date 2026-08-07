namespace AppTesisAPI.Models
{
    public class PacientePsicologo
    {
        public int Id { get; set; }

        public int PacienteId { get; set; }

        public int PsicologoId { get; set; }

        public DateTime FechaAsignacion { get; set; } = DateTime.UtcNow;

        public bool Activo { get; set; } = true;
    }
}
