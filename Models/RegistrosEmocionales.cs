using System;

namespace AppTesisAPI.Models
{
    /// <summary>
    /// Registro emocional del usuario.
    /// </summary>
    public class RegistrosEmocionales
    {
        public int Id { get; set; }

        public int NivelAnimo { get; set; }

        public int NivelEstres { get; set; }

        public string Nota { get; set; }

        public DateTime Fecha { get; set; }

        public int UsuarioId { get; set; }

        public string Categoria { get; set; }
    }
}