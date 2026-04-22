using System;

namespace AppTesisAPI.Models
{
    /// <summary>
    /// Código de recuperación de contraseña.
    /// </summary>
    public class RecuperacionPassword
    {
        public int Id { get; set; }

        public string Email { get; set; }

        public string Codigo { get; set; }

        public DateTime FechaExpiracion { get; set; }
    }
}