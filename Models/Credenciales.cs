namespace AppTesisAPI.Models
{
    /// <summary>
    /// Representa las credenciales de acceso del usuario.
    /// </summary>
    public class Credenciales
    {
        public int Id { get; set; }

        /// <summary>
        /// Correo electrónico.
        /// </summary>
        public string Email { get; set; }

        /// <summary>
        /// Contraseña (en producción debe ir encriptada).
        /// </summary>
        public string PasswordHash { get; set; }

        /// <summary>
        /// Rol del usuario.
        /// </summary>
        public string Rol { get; set; }

        /// <summary>
        /// Relación con usuario.
        /// </summary>
        public int UsuarioId { get; set; }

        /// <summary>
        /// Indica si está activo.
        /// </summary>
        public bool Activo { get; set; } = true;
    }
}