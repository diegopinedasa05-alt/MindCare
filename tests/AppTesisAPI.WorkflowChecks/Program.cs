using AppTesisAPI.Services;

var checks = new Dictionary<string, bool>
{
    ["Pendiente -> Confirmada"] =
        CitaWorkflow.PuedeCambiar(CitaWorkflow.Pendiente, CitaWorkflow.Confirmada),
    ["Pendiente -> Cancelada"] =
        CitaWorkflow.PuedeCambiar(CitaWorkflow.Pendiente, CitaWorkflow.Cancelada),
    ["Confirmada -> No asistio"] =
        CitaWorkflow.PuedeCambiar(CitaWorkflow.Confirmada, CitaWorkflow.NoAsistio),
    ["Atendida es final"] = CitaWorkflow.EsFinal(CitaWorkflow.Atendida),
    ["No asistio es final"] = CitaWorkflow.EsFinal("No asistió"),
    ["Cancelada es final"] = CitaWorkflow.EsFinal(CitaWorkflow.Cancelada),
    ["Atendida no vuelve a pendiente"] =
        !CitaWorkflow.PuedeCambiar(CitaWorkflow.Atendida, CitaWorkflow.Pendiente),
    ["No se finaliza por cambio generico"] =
        !CitaWorkflow.PuedeCambiar(CitaWorkflow.Confirmada, CitaWorkflow.Atendida),
    ["Normaliza variantes con acento"] =
        CitaWorkflow.Normalizar("No asistió") == CitaWorkflow.NoAsistio
};

foreach (var check in checks)
{
    Console.WriteLine($"{(check.Value ? "OK" : "ERROR")} - {check.Key}");
}

if (checks.Values.Any(value => !value))
    throw new InvalidOperationException("Fallo una validacion del flujo de citas.");

Console.WriteLine($"{checks.Count} validaciones del flujo de citas superadas.");
