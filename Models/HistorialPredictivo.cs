using System;

namespace AppTesisAPI.Models
{
    public class HistorialPredictivo
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public string NivelRiesgo { get; set; }

        public DateTime Fecha { get; set; }

        public string Origen { get; set; }
    }
}