namespace AppTesisAPI.Models
{
    /// <summary>
    /// Representa un psicólogo del sistema.
    /// </summary>
    public class Psicologo
    {
        public int Id { get; set; }

        public string Nombre { get; set; }

        public string Especialidad { get; set; }

        public string Zona { get; set; }

        public string Telefono { get; set; }
    }
}