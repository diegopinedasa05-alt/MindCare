using System;

namespace AppTesisAPI.Models
{
    /// <summary>
    /// Registro de accesos al sistema.
    /// </summary>
    public class AuditoriaAcceso
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public DateTime Fecha { get; set; }

        public string Ip { get; set; }
    }
}