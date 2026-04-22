using System;

namespace AppTesisAPI.Models
{
    /// <summary>
    /// Representa el test PHQ-9.
    /// </summary>
    public class TestPHQ9
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public int P1 { get; set; }
        public int P2 { get; set; }
        public int P3 { get; set; }
        public int P4 { get; set; }
        public int P5 { get; set; }
        public int P6 { get; set; }
        public int P7 { get; set; }
        public int P8 { get; set; }
        public int P9 { get; set; }

        public int PuntajeTotal { get; set; }

        public DateTime Fecha { get; set; }
    }
}