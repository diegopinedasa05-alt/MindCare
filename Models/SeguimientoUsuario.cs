namespace AppTesisAPI.Models
{
    public class SeguimientoUsuario
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public DateTime Fecha { get; set; } = DateTime.UtcNow.Date;

        public int TareasCompletadas { get; set; }

        public int TotalTareas { get; set; }

        public string Respuesta1 { get; set; } = "";

        public string Respuesta2 { get; set; } = "";

        public string Respuesta3 { get; set; } = "";

        public string AccionPrincipal { get; set; } = "";

        public string NivelRiesgo { get; set; } = "";

        public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
    }
}
