namespace AppTesisAPI.Models
{
    /// <summary>
    /// Datos para login.
    /// </summary>
    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}