using System;

namespace AppTesisAPI.Models
{
    /// <summary>
    /// Representa un usuario del sistema (paciente o psicólogo).
    /// </summary>
    public class Usuario
    {
        /// <summary>
        /// Identificador único.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Nombre completo.
        /// </summary>
        public string Nombre { get; set; }

        /// <summary>
        /// Número telefónico.
        /// </summary>
        public string Telefono { get; set; }

        /// <summary>
        /// Especialidad (solo psicólogos).
        /// </summary>
        public string Especialidad { get; set; }

        /// <summary>
        /// Zona geográfica.
        /// </summary>
        public string Zona { get; set; }

        /// <summary>
        /// Fecha de registro.
        /// </summary>
        public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    }
}