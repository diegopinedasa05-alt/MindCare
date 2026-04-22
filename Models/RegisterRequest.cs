namespace AppTesisAPI.Models
{
    public class RegisterRequest
    {
        public string Nombre { get; set; } = "";

        public string Email { get; set; } = "";

        public string Password { get; set; } = "";

        public string Telefono { get; set; } = "";

        public string Zona { get; set; } = "";

        // SOLO lo usa AdminController
        public string Especialidad { get; set; } = "";
    }
}