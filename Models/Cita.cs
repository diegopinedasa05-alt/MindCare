using System;

namespace AppTesisAPI.Models
{
    /// <summary>
    /// Representa una cita entre usuario y psicólogo.
    /// </summary>
    public class Cita
    {
        public int Id { get; set; }

        public DateTime Fecha { get; set; }

        /// <summary>
        /// Estado de la cita.
        /// </summary>
        public string Estado { get; set; }

        public string Observacion { get; set; }

        public int UsuarioId { get; set; }

        public int PsicologoId { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    }
}