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
        public string Estado { get; set; } = "";

        public string Observacion { get; set; } = "";

        public int UsuarioId { get; set; }

        public int PsicologoId { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Fecha real en la que el profesional finalizo la atencion.
        /// </summary>
        public DateTime? FechaAtencionUtc { get; set; }

        /// <summary>
        /// Fecha del ultimo cambio de estado registrado.
        /// </summary>
        public DateTime? FechaEstadoUtc { get; set; }

        /// <summary>
        /// Usuario que realizo el ultimo cambio de estado.
        /// </summary>
        public int? EstadoActualizadoPorUsuarioId { get; set; }
    }
}
