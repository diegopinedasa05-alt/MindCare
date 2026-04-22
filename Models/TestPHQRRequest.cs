using System.Collections.Generic;

namespace AppTesisAPI.Models
{
    public class TestPHQ9Request
    {
        public int UsuarioId { get; set; }
        public List<int> Respuestas { get; set; }
    }
}