namespace AppTesisAPI.Models
{
    public class ConsentimientoUsuario
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public string VersionDocumento { get; set; } = "";

        public DateTime FechaAceptacion { get; set; } = DateTime.UtcNow;

        public string Ip { get; set; } = "";

        public string UserAgent { get; set; } = "";
    }
}
