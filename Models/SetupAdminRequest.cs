namespace AppTesisAPI.Models
{
    public class SetupAdminRequest
    {
        public string SetupKey { get; set; } = "";

        public string Nombre { get; set; } = "";

        public string Email { get; set; } = "";

        public string Password { get; set; } = "";
    }
}
