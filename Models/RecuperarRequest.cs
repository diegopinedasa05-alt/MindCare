namespace AppTesisAPI.Models
{
    public class RecuperarRequest
    {
        public string Email { get; set; }
        public string Codigo { get; set; }
        public string NuevaPassword { get; set; }
    }
}