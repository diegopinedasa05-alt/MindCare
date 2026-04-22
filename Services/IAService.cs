namespace AppTesisAPI.Services
{
    public class IAService
    {
        public string Evaluar(int puntajePHQ9, int animo, int estres)
        {
            if (puntajePHQ9 >= 20 || estres >= 8)
                return "ALTO RIESGO";

            if (puntajePHQ9 >= 10)
                return "RIESGO MEDIO";

            return "BAJO";
        }
    }
}