namespace AppTesisAPI.Services;

public static class CitaWorkflow
{
    public const string Pendiente = "Pendiente";
    public const string Confirmada = "Confirmada";
    public const string Atendida = "Atendida";
    public const string NoAsistio = "No asistio";
    public const string Cancelada = "Cancelada";

    public static string? Normalizar(string? estado)
    {
        var value = (estado ?? "")
            .Trim()
            .ToLowerInvariant()
            .Replace("á", "a")
            .Replace("é", "e")
            .Replace("í", "i")
            .Replace("ó", "o")
            .Replace("ú", "u");

        return value switch
        {
            "pendiente" => Pendiente,
            "confirmada" or "confirmado" => Confirmada,
            "atendida" or "atendido" or "completada" or "completado" => Atendida,
            "no asistio" or "noasistio" => NoAsistio,
            "cancelada" or "cancelado" => Cancelada,
            _ => null
        };
    }

    public static bool PuedeCambiar(string estadoActual, string estadoNuevo)
    {
        var actual = Normalizar(estadoActual) ?? Pendiente;
        var nuevo = Normalizar(estadoNuevo);

        if (nuevo is null || actual == nuevo)
            return false;

        return actual switch
        {
            Pendiente => nuevo is Confirmada or NoAsistio or Cancelada,
            Confirmada => nuevo is NoAsistio or Cancelada,
            _ => false
        };
    }

    public static bool EsFinal(string estado)
    {
        var normalizado = Normalizar(estado);
        return normalizado is Atendida or NoAsistio or Cancelada;
    }
}
