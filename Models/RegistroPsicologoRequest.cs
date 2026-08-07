namespace AppTesisAPI.Models;

public class RegistroPsicologoRequest
{
    public string Nombre { get; set; } = "";

    public string ApellidoPaterno { get; set; } = "";

    public string ApellidoMaterno { get; set; } = "";

    public string Email { get; set; } = "";

    public string Password { get; set; } = "";

    public string Telefono { get; set; } = "";

    public string Zona { get; set; } = "";

    public string NumeroCedula { get; set; } = "";

    public string Institucion { get; set; } = "";

    public string Especialidad { get; set; } = "";

    public int? AniosExperiencia { get; set; }

    public bool AceptaTerminos { get; set; }
}
