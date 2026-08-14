namespace AppTesisAPI.Models
{
    public class NotaSeguimiento
    {
        public int Id { get; set; }

        public int PacienteId { get; set; }

        public int PsicologoId { get; set; }

        public int? CitaId { get; set; }

        public string Nota { get; set; } = "";

        public string PlanAccion { get; set; } = "";

        public DateTime Fecha { get; set; } = DateTime.UtcNow;
    }
}
