using AppTesisAPI.Models;

namespace AppTesisAPI.Services
{
    public class IAService
    {
        private const string VersionModelo = "MindCare Rules Engine v4.2";

        public object Evaluar(
            TestPHQ9? phq9,
            TestEstresLaboral? estresLaboral,
            RegistrosEmocionales? ultimoRegistro,
            IReadOnlyList<RegistrosEmocionales> registrosRecientes)
        {
            if (phq9 == null &&
                estresLaboral == null &&
                ultimoRegistro == null)
            {
                return ResultadoSinDatos();
            }

            var factores = new List<object>();
            var recomendaciones = new List<string>();
            var score = 0;

            var puntajePHQ9 = phq9?.PuntajeTotal ?? 0;
            var puntajeEstresLaboral = estresLaboral?.PuntajeTotal ?? 0;
            var animo = ultimoRegistro?.NivelAnimo ?? 0;
            var estres = ultimoRegistro?.NivelEstres ?? 0;
            var tendencia = CalcularTendencia(registrosRecientes);
            var volatilidad = CalcularVolatilidad(registrosRecientes);
            var diasSinRegistro = CalcularDiasSinRegistro(ultimoRegistro);
            var diasDesdePHQ9 = CalcularDiasDesde(phq9?.Fecha);
            var diasDesdeEstresLaboral = CalcularDiasDesde(estresLaboral?.Fecha);

            AgregarFactorPHQ9(
                phq9,
                factores,
                recomendaciones,
                ref score);

            AgregarFactorEstresLaboral(
                puntajeEstresLaboral,
                factores,
                ref score);

            AgregarFactorRegistroEmocional(
                animo,
                estres,
                diasSinRegistro,
                factores,
                ref score);

            AgregarFactorTendencia(
                tendencia,
                factores,
                ref score);

            AgregarFactorVolatilidad(
                volatilidad,
                factores,
                ref score);

            AgregarFactorRiesgoCombinado(
                puntajePHQ9,
                puntajeEstresLaboral,
                animo,
                estres,
                factores,
                ref score);

            AgregarFactorActualizacion(
                diasDesdePHQ9,
                diasDesdeEstresLaboral,
                factores,
                ref score);

            var protectores =
                CalcularFactoresProtectores(
                    registrosRecientes,
                    tendencia,
                    puntajePHQ9,
                    puntajeEstresLaboral,
                    animo,
                    estres);

            score -= protectores.ReduccionScore;
            score = Math.Clamp(score, 0, 100);

            var nivel = Nivel(score, phq9);
            var mensaje = Mensaje(nivel);
            var prioridad = Prioridad(nivel);
            var confianza = CalcularConfianza(
                phq9,
                estresLaboral,
                ultimoRegistro,
                registrosRecientes);

            var calidadDatos =
                CalcularCalidadDatos(
                    phq9,
                    estresLaboral,
                    ultimoRegistro,
                    registrosRecientes);

            var banderasClinicas =
                CalcularBanderasClinicas(
                    nivel,
                    phq9,
                    tendencia,
                    volatilidad,
                    diasSinRegistro,
                    confianza);

            CompletarRecomendaciones(
                nivel,
                tendencia.Estado,
                recomendaciones);

            var perfilClinico =
                ClasificarPerfilClinico(
                    puntajePHQ9,
                    puntajeEstresLaboral,
                    animo,
                    estres,
                    tendencia,
                    volatilidad);

            var trayectoriaRiesgo =
                CalcularTrayectoriaRiesgo(
                    nivel,
                    tendencia,
                    volatilidad,
                    diasSinRegistro,
                    confianza);

            var accionPrioritaria =
                DefinirAccionPrioritaria(
                    nivel,
                    tendencia,
                    confianza,
                    diasSinRegistro,
                    recomendaciones);

            var indiceBienestar =
                CalcularIndiceBienestar(
                    score,
                    confianza,
                    tendencia,
                    volatilidad,
                    protectores.Items.Count);

            var decisionClinica =
                ConstruirDecisionClinica(
                    nivel,
                    perfilClinico,
                    trayectoriaRiesgo,
                    accionPrioritaria,
                    banderasClinicas.Count,
                    confianza);

            var matrizIntervencion =
                ConstruirMatrizIntervencion(
                    nivel,
                    trayectoriaRiesgo,
                    accionPrioritaria,
                    confianza);

            return new
            {
                modelo = VersionModelo,
                nivel,
                mensaje,
                prioridad,
                score,
                confianza,
                puntaje = puntajePHQ9,
                animo,
                estres,
                puntajeEstresLaboral,
                tendencia = tendencia.Estado,
                tendenciaDetalle = tendencia,
                volatilidad = new
                {
                    indice = volatilidad.Indice,
                    nivel = volatilidad.Nivel,
                    interpretacion = volatilidad.Interpretacion
                },
                calidadDatos,
                perfilClinico,
                trayectoriaRiesgo,
                accionPrioritaria,
                indiceBienestar,
                decisionClinica,
                matrizIntervencion,
                preguntasSeguimiento = PreguntasSeguimiento(
                    perfilClinico,
                    trayectoriaRiesgo,
                    nivel,
                    confianza),
                senalDominante = SenalDominante(factores),
                banderasClinicas,
                factoresProtectores = protectores.Items,
                dimensiones = new
                {
                    depresion = Normalizar(puntajePHQ9, 27),
                    estresLaboral = Normalizar(puntajeEstresLaboral, 72),
                    estresDiario = Normalizar(estres, 10),
                    animoBajo = animo > 0 ? Normalizar(10 - animo, 10) : 0,
                    deterioro = tendencia.Estado == "Deterioro" ? 85 :
                        tendencia.Estado == "Estable" ? 35 :
                        tendencia.Estado == "Mejora" ? 15 : 0,
                    adherencia = registrosRecientes.Count >= 7 ? 90 :
                        registrosRecientes.Count >= 3 ? 60 :
                        registrosRecientes.Count > 0 ? 35 : 0,
                    volatilidad = volatilidad.Indice,
                    calidadSenal = calidadDatos.Porcentaje,
                    bienestar = indiceBienestar.Puntaje
                },
                factores,
                recomendaciones,
                recomendacionesDetalle =
                    recomendaciones.Select((x, i) => new
                    {
                        orden = i + 1,
                        accion = x,
                        tipo = i == 0 ? "Prioritaria" : "Seguimiento"
                    }),
                semaforo = new
                {
                    color = Color(nivel),
                    etiqueta = Etiqueta(nivel),
                    accion = Accion(nivel)
                },
                protocolo = new
                {
                    requiereContactoProfesional =
                        nivel == "Critico" || nivel == "Alto",
                    requiereRevisionPsicologo =
                        nivel == "Critico" ||
                        nivel == "Alto" ||
                        nivel == "Medio",
                    aclaracion =
                        "MindCare no diagnostica ni sustituye atencion psicologica profesional; prioriza senales para seguimiento."
                },
                alertaSeguridad = AlertaSeguridad(phq9, nivel),
                planSeguimiento = PlanSeguimiento(
                    nivel,
                    tendencia.Estado,
                    confianza,
                    diasSinRegistro),
                explicacionScore = ExplicarScore(
                    score,
                    factores,
                    protectores.Items,
                    calidadDatos),
                auditoriaModelo = AuditoriaModelo(
                    phq9,
                    estresLaboral,
                    ultimoRegistro,
                    registrosRecientes,
                    factores.Count,
                    protectores.Items.Count,
                    banderasClinicas.Count),
                metodologia =
                    "Motor local basado en reglas ponderadas: PHQ-9, pregunta 9, estres laboral, ultimo registro emocional, tendencia de 14 dias, volatilidad, trayectoria, bienestar, calidad de datos y factores protectores."
            };
        }

        private static object ResultadoSinDatos()
        {
            return new
            {
                modelo = VersionModelo,
                nivel = "Sin datos",
                mensaje = "Falta informacion para analisis",
                prioridad = "Captura inicial",
                score = 0,
                confianza = 0,
                puntaje = 0,
                animo = 0,
                estres = 0,
                puntajeEstresLaboral = 0,
                tendencia = "Sin datos",
                tendenciaDetalle = new
                {
                    estado = "Sin datos",
                    delta = 0.0,
                    balanceInicial = 0.0,
                    balanceReciente = 0.0,
                    muestras = 0
                },
                volatilidad = new
                {
                    indice = 0,
                    nivel = "Sin datos",
                    interpretacion =
                        "No hay registros suficientes para medir variacion emocional."
                },
                calidadDatos = new
                {
                    porcentaje = 0,
                    nivel = "Inicial",
                    interpretacion =
                        "Faltan registros y evaluaciones para un analisis confiable.",
                    faltantes = new[]
                    {
                        "Registro emocional",
                        "PHQ-9",
                        "Estres laboral"
                    }
                },
                perfilClinico = new
                {
                    tipo = "Linea base pendiente",
                    descripcion =
                        "Aun no existe informacion suficiente para construir un perfil orientativo.",
                    foco = "Captura inicial"
                },
                trayectoriaRiesgo = new
                {
                    estado = "Sin datos",
                    direccion = "Pendiente",
                    momentum = 0,
                    interpretacion =
                        "Se requiere historial emocional para estimar trayectoria."
                },
                accionPrioritaria = new
                {
                    titulo = "Completar linea base",
                    detalle =
                        "Registrar estado emocional y completar evaluaciones iniciales.",
                    plazo = "Hoy",
                    responsable = "Usuario"
                },
                indiceBienestar = new
                {
                    puntaje = 0,
                    nivel = "Sin datos",
                    interpretacion =
                        "No hay datos suficientes para calcular bienestar orientativo."
                },
                decisionClinica = new
                {
                    nivelDecision = "Captura inicial",
                    resumen =
                        "Se requiere linea base para generar decision orientativa.",
                    razon =
                        "Sin registros ni evaluaciones suficientes.",
                    siguientePaso =
                        "Completar registro emocional, PHQ-9 y estres laboral."
                },
                matrizIntervencion = new
                {
                    nivel = "Inicial",
                    objetivo = "Construir linea base",
                    intervencion = "Capturar datos iniciales",
                    seguimiento = "Registro emocional y evaluaciones",
                    criterioEscalamiento =
                        "Escalar si aparecen senales criticas o alto malestar."
                },
                preguntasSeguimiento = new[]
                {
                    "¿Como te has sentido emocionalmente hoy?",
                    "¿Existe algun evento reciente que quieras registrar?",
                    "¿Puedes completar las evaluaciones iniciales?"
                },
                senalDominante = new
                {
                    fuente = "Sin datos",
                    peso = 0,
                    severidad = "Inicial"
                },
                banderasClinicas = Array.Empty<object>(),
                factoresProtectores = Array.Empty<object>(),
                dimensiones = new
                {
                    depresion = 0,
                    estresLaboral = 0,
                    estresDiario = 0,
                    animoBajo = 0,
                    deterioro = 0,
                    adherencia = 0,
                    volatilidad = 0,
                    calidadSenal = 0,
                    bienestar = 0
                },
                factores = Array.Empty<object>(),
                recomendaciones = new[]
                {
                    "Registrar estado emocional y completar evaluaciones iniciales."
                },
                recomendacionesDetalle = new[]
                {
                    new
                    {
                        orden = 1,
                        accion =
                            "Registrar estado emocional y completar evaluaciones iniciales.",
                        tipo = "Prioritaria"
                    }
                },
                semaforo = new
                {
                    color = "gris",
                    etiqueta = "Sin datos",
                    accion = "Capturar informacion base"
                },
                protocolo = new
                {
                    requiereContactoProfesional = false,
                    requiereRevisionPsicologo = false,
                    aclaracion =
                        "MindCare no diagnostica ni sustituye atencion psicologica profesional; prioriza senales para seguimiento."
                },
                alertaSeguridad = new
                {
                    activa = false,
                    nivel = "Sin datos",
                    mensaje =
                        "Sin senales evaluables por falta de informacion.",
                    accion =
                        "Completar evaluaciones iniciales."
                },
                planSeguimiento = new
                {
                    frecuenciaRegistro = "Registrar estado emocional inicial",
                    evaluacion = "Completar PHQ-9 y estres laboral",
                    contactoProfesional = "Opcional segun necesidad del usuario",
                    autocuidado = "Construir linea base con registros consistentes"
                },
                explicacionScore = new
                {
                    resumen =
                        "Score 0 porque no existen datos suficientes.",
                    principalesFactores = Array.Empty<object>(),
                    factoresProtectores = Array.Empty<object>(),
                    calidad =
                        "Inicial"
                },
                auditoriaModelo = new
                {
                    version = VersionModelo,
                    modalidad = "Reglas locales explicables",
                    entradasUsadas = Array.Empty<string>(),
                    reglasActivadas = 0,
                    protectoresDetectados = 0,
                    banderasDetectadas = 0,
                    limitacion =
                        "Sin datos suficientes; no se realiza inferencia clinica."
                },
                metodologia =
                    "Motor local basado en reglas ponderadas: PHQ-9, pregunta 9, estres laboral, ultimo registro emocional y tendencia de 14 dias."
            };
        }

        private static void AgregarFactorPHQ9(
            TestPHQ9? phq9,
            List<object> factores,
            List<string> recomendaciones,
            ref int score)
        {
            if (phq9 == null)
                return;

            if (phq9.P9 > 0)
            {
                score += 100;
                factores.Add(Factor(
                    "PHQ-9 P9",
                    "Respuesta positiva en ideacion autolesiva.",
                    100,
                    "Critico"));
                recomendaciones.Add(
                    "Activar protocolo de seguridad y contacto profesional inmediato.");
                return;
            }

            if (phq9.PuntajeTotal >= 20)
            {
                score += 45;
                factores.Add(Factor(
                    "PHQ-9",
                    "Puntaje en rango severo.",
                    45,
                    "Alto"));
            }
            else if (phq9.PuntajeTotal >= 15)
            {
                score += 35;
                factores.Add(Factor(
                    "PHQ-9",
                    "Puntaje en rango moderadamente severo.",
                    35,
                    "Alto"));
            }
            else if (phq9.PuntajeTotal >= 10)
            {
                score += 24;
                factores.Add(Factor(
                    "PHQ-9",
                    "Puntaje en rango moderado.",
                    24,
                    "Medio"));
            }
            else if (phq9.PuntajeTotal >= 5)
            {
                score += 12;
                factores.Add(Factor(
                    "PHQ-9",
                    "Sintomas leves reportados.",
                    12,
                    "Bajo"));
            }
        }

        private static void AgregarFactorEstresLaboral(
            int puntaje,
            List<object> factores,
            ref int score)
        {
            if (puntaje <= 0)
                return;

            if (puntaje >= 61)
            {
                score += 28;
                factores.Add(Factor(
                    "Estres laboral",
                    "Puntaje compatible con estres grave.",
                    28,
                    "Alto"));
            }
            else if (puntaje >= 49)
            {
                score += 22;
                factores.Add(Factor(
                    "Estres laboral",
                    "Puntaje compatible con estres alto.",
                    22,
                    "Alto"));
            }
            else if (puntaje >= 37)
            {
                score += 15;
                factores.Add(Factor(
                    "Estres laboral",
                    "Puntaje compatible con estres medio.",
                    15,
                    "Medio"));
            }
            else if (puntaje >= 25)
            {
                score += 8;
                factores.Add(Factor(
                    "Estres laboral",
                    "Puntaje compatible con estres leve.",
                    8,
                    "Bajo"));
            }
        }

        private static void AgregarFactorRegistroEmocional(
            int animo,
            int estres,
            int? diasSinRegistro,
            List<object> factores,
            ref int score)
        {
            if (animo > 0 && animo <= 2)
            {
                score += 32;
                factores.Add(Factor(
                    "Animo",
                    "Animo muy bajo en el registro mas reciente.",
                    32,
                    "Alto"));
            }
            else if (animo > 0 && animo <= 4)
            {
                score += 20;
                factores.Add(Factor(
                    "Animo",
                    "Animo bajo en el registro mas reciente.",
                    20,
                    "Medio"));
            }

            if (estres >= 9)
            {
                score += 28;
                factores.Add(Factor(
                    "Estres diario",
                    "Estres muy alto en el registro mas reciente.",
                    28,
                    "Alto"));
            }
            else if (estres >= 7)
            {
                score += 18;
                factores.Add(Factor(
                    "Estres diario",
                    "Estres elevado en el registro mas reciente.",
                    18,
                    "Medio"));
            }

            if (diasSinRegistro >= 7)
            {
                score += 8;
                factores.Add(Factor(
                    "Adherencia",
                    "Mas de una semana sin registro emocional.",
                    8,
                    "Bajo"));
            }
        }

        private static void AgregarFactorTendencia(
            TendenciaEmocional tendencia,
            List<object> factores,
            ref int score)
        {
            if (tendencia.Estado == "Deterioro")
            {
                score += 20;
                factores.Add(Factor(
                    "Tendencia",
                    "La tendencia de 14 dias muestra deterioro emocional.",
                    20,
                    "Medio"));
            }
            else if (tendencia.Estado == "Mejora")
            {
                score -= 8;
                factores.Add(Factor(
                    "Tendencia",
                    "La tendencia reciente muestra mejora emocional.",
                    -8,
                "Protector"));
            }
        }

        private static void AgregarFactorVolatilidad(
            VolatilidadEmocional volatilidad,
            List<object> factores,
            ref int score)
        {
            if (volatilidad.Indice >= 70)
            {
                score += 18;
                factores.Add(Factor(
                    "Volatilidad",
                    "Variacion emocional alta entre registros recientes.",
                    18,
                    "Medio"));
            }
            else if (volatilidad.Indice >= 45)
            {
                score += 10;
                factores.Add(Factor(
                    "Volatilidad",
                    "Variacion emocional moderada entre registros recientes.",
                    10,
                    "Bajo"));
            }
        }

        private static void AgregarFactorRiesgoCombinado(
            int phq9,
            int estresLaboral,
            int animo,
            int estresDiario,
            List<object> factores,
            ref int score)
        {
            if (animo > 0 &&
                animo <= 3 &&
                estresDiario >= 8)
            {
                score += 22;
                factores.Add(Factor(
                    "Combinacion emocional",
                    "Animo bajo y estres diario alto en el registro mas reciente.",
                    22,
                    "Alto"));
            }

            if (phq9 >= 10 &&
                estresLaboral >= 37)
            {
                score += 16;
                factores.Add(Factor(
                    "Comorbilidad de senales",
                    "PHQ-9 y estres laboral se encuentran simultaneamente elevados.",
                    16,
                    "Medio"));
            }
        }

        private static void AgregarFactorActualizacion(
            int? diasDesdePHQ9,
            int? diasDesdeEstresLaboral,
            List<object> factores,
            ref int score)
        {
            if (diasDesdePHQ9 >= 30)
            {
                score += 5;
                factores.Add(Factor(
                    "Actualizacion PHQ-9",
                    "PHQ-9 con mas de 30 dias desde la ultima captura.",
                    5,
                    "Bajo"));
            }

            if (diasDesdeEstresLaboral >= 30)
            {
                score += 5;
                factores.Add(Factor(
                    "Actualizacion estres laboral",
                    "Evaluacion de estres laboral con mas de 30 dias.",
                    5,
                    "Bajo"));
            }
        }

        private static TendenciaEmocional CalcularTendencia(
            IReadOnlyList<RegistrosEmocionales> registros)
        {
            if (registros.Count < 4)
                return new TendenciaEmocional(
                    "Insuficiente",
                    0,
                    0,
                    0,
                    registros.Count);

            var ordenados =
                registros
                .OrderBy(x => x.Fecha)
                .ToList();

            var mitad = ordenados.Count / 2;
            var inicio = ordenados.Take(mitad).ToList();
            var fin = ordenados.Skip(mitad).ToList();

            var balanceInicio =
                inicio.Average(Balance);

            var balanceFin =
                fin.Average(Balance);

            var delta =
                Math.Round(balanceFin - balanceInicio, 2);

            if (delta <= -2)
                return new TendenciaEmocional(
                    "Deterioro",
                    delta,
                    Math.Round(balanceInicio, 2),
                    Math.Round(balanceFin, 2),
                    registros.Count);

            if (delta >= 2)
                return new TendenciaEmocional(
                    "Mejora",
                    delta,
                    Math.Round(balanceInicio, 2),
                    Math.Round(balanceFin, 2),
                    registros.Count);

            return new TendenciaEmocional(
                "Estable",
                delta,
                Math.Round(balanceInicio, 2),
                Math.Round(balanceFin, 2),
                registros.Count);
        }

        private static VolatilidadEmocional CalcularVolatilidad(
            IReadOnlyList<RegistrosEmocionales> registros)
        {
            if (registros.Count < 4)
                return new VolatilidadEmocional(
                    0,
                    "Insuficiente",
                    "Se requieren al menos 4 registros para estimar volatilidad.");

            var ordenados =
                registros
                .OrderBy(x => x.Fecha)
                .ToList();

            var diferencias =
                new List<double>();

            for (var i = 1; i < ordenados.Count; i++)
            {
                diferencias.Add(
                    Math.Abs(
                        Balance(ordenados[i]) -
                        Balance(ordenados[i - 1])));
            }

            var promedio =
                diferencias.Average();

            var indice =
                Math.Clamp(
                    (int)Math.Round((promedio / 8.0) * 100),
                    0,
                    100);

            if (indice >= 70)
                return new VolatilidadEmocional(
                    indice,
                    "Alta",
                    "Cambios emocionales bruscos entre registros recientes.");

            if (indice >= 45)
                return new VolatilidadEmocional(
                    indice,
                    "Moderada",
                    "Variacion emocional visible, requiere observacion.");

            return new VolatilidadEmocional(
                indice,
                "Baja",
                "Variacion emocional acotada en el periodo reciente.");
        }

        private static double Balance(RegistrosEmocionales registro)
        {
            return registro.NivelAnimo - registro.NivelEstres;
        }

        private static int? CalcularDiasSinRegistro(
            RegistrosEmocionales? registro)
        {
            if (registro == null)
                return null;

            return Math.Max(
                0,
                (int)Math.Floor(
                    (DateTime.UtcNow - registro.Fecha).TotalDays));
        }

        private static int? CalcularDiasDesde(DateTime? fecha)
        {
            if (fecha == null)
                return null;

            return Math.Max(
                0,
                (int)Math.Floor(
                    (DateTime.UtcNow - fecha.Value).TotalDays));
        }

        private static int CalcularConfianza(
            TestPHQ9? phq9,
            TestEstresLaboral? estresLaboral,
            RegistrosEmocionales? ultimoRegistro,
            IReadOnlyList<RegistrosEmocionales> registros)
        {
            var confianza = 0;

            if (phq9 != null) confianza += 30;
            if (estresLaboral != null) confianza += 20;
            if (ultimoRegistro != null) confianza += 20;

            confianza += Math.Min(30, registros.Count * 4);

            return Math.Clamp(confianza, 0, 100);
        }

        private static CalidadDatos CalcularCalidadDatos(
            TestPHQ9? phq9,
            TestEstresLaboral? estresLaboral,
            RegistrosEmocionales? ultimoRegistro,
            IReadOnlyList<RegistrosEmocionales> registros)
        {
            var puntos = 0;
            var faltantes = new List<string>();

            if (phq9 != null)
                puntos += 25;
            else
                faltantes.Add("PHQ-9");

            if (estresLaboral != null)
                puntos += 20;
            else
                faltantes.Add("Estres laboral");

            if (ultimoRegistro != null)
                puntos += 25;
            else
                faltantes.Add("Registro emocional reciente");

            puntos += Math.Min(30, registros.Count * 4);

            var porcentaje =
                Math.Clamp(puntos, 0, 100);

            var nivel =
                porcentaje >= 80 ? "Alta" :
                porcentaje >= 55 ? "Media" :
                porcentaje >= 30 ? "Basica" :
                "Inicial";

            var interpretacion =
                nivel == "Alta"
                    ? "Datos suficientes para priorizacion confiable."
                    : nivel == "Media"
                        ? "Datos utiles, aunque conviene mantener registros."
                        : "Se recomienda completar evaluaciones y registros.";

            return new CalidadDatos(
                porcentaje,
                nivel,
                interpretacion,
                faltantes.ToArray());
        }

        private static List<object> CalcularBanderasClinicas(
            string nivel,
            TestPHQ9? phq9,
            TendenciaEmocional tendencia,
            VolatilidadEmocional volatilidad,
            int? diasSinRegistro,
            int confianza)
        {
            var banderas = new List<object>();

            if (phq9?.P9 > 0)
                banderas.Add(Bandera(
                    "Seguridad",
                    "Respuesta positiva en PHQ-9 P9.",
                    "Critica"));

            if (nivel == "Alto" || nivel == "Critico")
                banderas.Add(Bandera(
                    "Priorizacion",
                    "Score requiere revision profesional prioritaria.",
                    nivel));

            if (tendencia.Estado == "Deterioro")
                banderas.Add(Bandera(
                    "Tendencia",
                    "Deterioro emocional en ventana reciente.",
                    "Media"));

            if (volatilidad.Indice >= 70)
                banderas.Add(Bandera(
                    "Volatilidad",
                    "Cambios emocionales bruscos.",
                    "Media"));

            if (diasSinRegistro >= 7)
                banderas.Add(Bandera(
                    "Adherencia",
                    "Mas de una semana sin registro.",
                    "Baja"));

            if (confianza < 45)
                banderas.Add(Bandera(
                    "Calidad de datos",
                    "La IA requiere mas informacion para aumentar confianza.",
                    "Informativa"));

            return banderas;
        }

        private static FactoresProtectores CalcularFactoresProtectores(
            IReadOnlyList<RegistrosEmocionales> registros,
            TendenciaEmocional tendencia,
            int phq9,
            int estresLaboral,
            int animo,
            int estresDiario)
        {
            var items = new List<object>();
            var reduccion = 0;

            if (registros.Count >= 7)
            {
                reduccion += 8;
                items.Add(Factor(
                    "Adherencia",
                    "Registro emocional constante en los ultimos 14 dias.",
                    -8,
                    "Protector"));
            }

            if (tendencia.Estado == "Mejora")
            {
                reduccion += 6;
                items.Add(Factor(
                    "Tendencia positiva",
                    "El balance emocional reciente muestra mejora.",
                    -6,
                    "Protector"));
            }

            if (animo >= 7 && estresDiario <= 4 && animo > 0)
            {
                reduccion += 6;
                items.Add(Factor(
                    "Balance reciente",
                    "Animo favorable y estres diario bajo.",
                    -6,
                    "Protector"));
            }

            if (phq9 <= 4 && estresLaboral <= 24 && (phq9 > 0 || estresLaboral > 0))
            {
                reduccion += 4;
                items.Add(Factor(
                    "Evaluaciones bajas",
                    "PHQ-9 o estres laboral sin elevacion relevante.",
                    -4,
                    "Protector"));
            }

            return new FactoresProtectores(
                Math.Min(reduccion, 18),
                items);
        }

        private static void CompletarRecomendaciones(
            string nivel,
            string tendencia,
            List<string> recomendaciones)
        {
            if (nivel == "Critico" && !recomendaciones.Any())
                recomendaciones.Add(
                    "Contactar inmediatamente con un profesional o red de apoyo.");

            if (nivel == "Alto")
                recomendaciones.Add(
                    "Agendar seguimiento psicologico prioritario y revisar factores detonantes.");

            if (nivel == "Medio")
                recomendaciones.Add(
                    "Mantener seguimiento cercano y repetir evaluacion durante la semana.");

            if (nivel == "Bajo")
                recomendaciones.Add(
                    "Continuar registros emocionales y habitos de autocuidado.");

            if (tendencia == "Deterioro")
                recomendaciones.Add(
                    "Revisar eventos recientes asociados al descenso emocional.");

            recomendaciones.Add(
                "Usar estos resultados como apoyo, no como diagnostico clinico.");

            var unicas =
                recomendaciones
                .Distinct()
                .Take(4)
                .ToList();

            recomendaciones.Clear();
            recomendaciones.AddRange(unicas);
        }

        private static string Nivel(int score, TestPHQ9? phq9)
        {
            if (phq9?.P9 > 0) return "Critico";
            if (score >= 70) return "Alto";
            if (score >= 35) return "Medio";
            return "Bajo";
        }

        private static string Mensaje(string nivel)
        {
            return nivel switch
            {
                "Critico" =>
                    "Alerta critica por senales de riesgo. Se recomienda contacto profesional inmediato.",
                "Alto" =>
                    "Riesgo alto. Se recomienda atencion profesional prioritaria.",
                "Medio" =>
                    "Riesgo moderado. Se recomienda seguimiento cercano.",
                "Bajo" =>
                    "Estado emocional sin alerta alta en este momento.",
                _ =>
                    "Falta informacion para analisis."
            };
        }

        private static string Prioridad(string nivel)
        {
            return nivel switch
            {
                "Critico" => "Intervencion inmediata",
                "Alto" => "Atencion prioritaria",
                "Medio" => "Seguimiento cercano",
                "Bajo" => "Monitoreo preventivo",
                _ => "Captura inicial"
            };
        }

        private static string Color(string nivel)
        {
            return nivel switch
            {
                "Critico" => "rojo",
                "Alto" => "naranja",
                "Medio" => "amarillo",
                "Bajo" => "verde",
                _ => "gris"
            };
        }

        private static string Etiqueta(string nivel)
        {
            return nivel switch
            {
                "Critico" => "Riesgo critico",
                "Alto" => "Riesgo alto",
                "Medio" => "Riesgo moderado",
                "Bajo" => "Riesgo bajo",
                _ => "Sin datos"
            };
        }

        private static string Accion(string nivel)
        {
            return nivel switch
            {
                "Critico" => "Contacto inmediato",
                "Alto" => "Priorizar cita",
                "Medio" => "Monitorear semana",
                "Bajo" => "Mantener habitos",
                _ => "Capturar datos"
            };
        }

        private static object PlanSeguimiento(
            string nivel,
            string tendencia,
            int confianza,
            int? diasSinRegistro)
        {
            var frecuencia =
                nivel == "Critico" || nivel == "Alto"
                    ? "Registro diario y revision profesional prioritaria"
                    : nivel == "Medio" || tendencia == "Deterioro"
                        ? "Registro 4 veces por semana y seguimiento cercano"
                        : "Registro 3 veces por semana";

            var evaluacion =
                confianza < 55
                    ? "Completar PHQ-9, estres laboral y registro emocional"
                    : "Repetir evaluaciones segun evolucion semanal";

            var contacto =
                nivel == "Critico"
                    ? "Contacto profesional o red de apoyo de forma inmediata"
                    : nivel == "Alto"
                        ? "Agendar seguimiento psicologico prioritario"
                        : nivel == "Medio"
                            ? "Considerar cita si la tendencia empeora"
                            : "Opcional segun necesidad del usuario";

            var autocuidado =
                diasSinRegistro >= 7
                    ? "Reactivar registro emocional y rutina basica"
                    : tendencia == "Deterioro"
                        ? "Identificar detonantes recientes y reducir carga"
                        : "Mantener habitos protectores y observacion preventiva";

            return new
            {
                frecuenciaRegistro = frecuencia,
                evaluacion,
                contactoProfesional = contacto,
                autocuidado
            };
        }

        private static object ExplicarScore(
            int score,
            List<object> factores,
            IReadOnlyList<object> protectores,
            CalidadDatos calidad)
        {
            return new
            {
                resumen =
                    $"Score {score}/100 calculado con reglas ponderadas y ajuste por factores protectores.",
                principalesFactores =
                    factores
                    .Take(5)
                    .ToArray(),
                factoresProtectores =
                    protectores
                    .Take(4)
                    .ToArray(),
                calidad =
                    calidad.Nivel,
                nota =
                    "El score prioriza seguimiento; no representa diagnostico clinico."
            };
        }

        private static object ClasificarPerfilClinico(
            int phq9,
            int estresLaboral,
            int animo,
            int estresDiario,
            TendenciaEmocional tendencia,
            VolatilidadEmocional volatilidad)
        {
            if (phq9 >= 15 && estresLaboral >= 49)
                return Perfil(
                    "Carga mixta elevada",
                    "Sintomas depresivos y estres laboral aparecen simultaneamente elevados.",
                    "Priorizar revision profesional y factores laborales.");

            if (phq9 >= 10 && animo > 0 && animo <= 4)
                return Perfil(
                    "Animo bajo persistente",
                    "PHQ-9 y ultimo registro sugieren bajo estado de animo.",
                    "Seguimiento emocional y reevaluacion PHQ-9.");

            if (estresLaboral >= 49 || estresDiario >= 8)
                return Perfil(
                    "Sobrecarga de estres",
                    "Predominan senales de estres laboral o estres diario alto.",
                    "Identificar detonantes, descanso y apoyo profesional si escala.");

            if (tendencia.Estado == "Deterioro")
                return Perfil(
                    "Deterioro reciente",
                    "La ventana de registros muestra descenso del balance emocional.",
                    "Revisar eventos recientes y aumentar frecuencia de registro.");

            if (volatilidad.Indice >= 70)
                return Perfil(
                    "Variabilidad emocional alta",
                    "Los registros muestran cambios emocionales bruscos.",
                    "Observar patrones, suenos, carga academica/laboral y detonantes.");

            if (tendencia.Estado == "Mejora")
                return Perfil(
                    "Recuperacion observada",
                    "La tendencia reciente muestra mejora del balance emocional.",
                    "Mantener habitos protectores y seguimiento preventivo.");

            return Perfil(
                "Monitoreo preventivo",
                "No predominan senales altas con los datos disponibles.",
                "Mantener registros y completar evaluaciones periodicas.");
        }

        private static object CalcularTrayectoriaRiesgo(
            string nivel,
            TendenciaEmocional tendencia,
            VolatilidadEmocional volatilidad,
            int? diasSinRegistro,
            int confianza)
        {
            var momentum = 0;

            if (nivel == "Critico") momentum += 45;
            else if (nivel == "Alto") momentum += 32;
            else if (nivel == "Medio") momentum += 18;
            else momentum += 5;

            if (tendencia.Estado == "Deterioro") momentum += 25;
            if (tendencia.Estado == "Mejora") momentum -= 18;
            if (volatilidad.Indice >= 70) momentum += 16;
            else if (volatilidad.Indice >= 45) momentum += 8;
            if (diasSinRegistro >= 7) momentum += 8;
            if (confianza < 45) momentum += 5;

            momentum = Math.Clamp(momentum, 0, 100);

            var direccion =
                tendencia.Estado == "Deterioro" ? "Ascendente" :
                tendencia.Estado == "Mejora" ? "Descendente" :
                "Estable";

            var estado =
                momentum >= 70 ? "Escalada probable" :
                momentum >= 45 ? "Vigilancia cercana" :
                momentum >= 25 ? "Observacion preventiva" :
                "Estable";

            return new
            {
                estado,
                direccion,
                momentum,
                interpretacion =
                    $"Trayectoria {direccion.ToLower()} con momentum {momentum}/100, basada en nivel, tendencia, volatilidad, adherencia y confianza."
            };
        }

        private static object DefinirAccionPrioritaria(
            string nivel,
            TendenciaEmocional tendencia,
            int confianza,
            int? diasSinRegistro,
            IReadOnlyList<string> recomendaciones)
        {
            if (nivel == "Critico")
                return AccionPrioritaria(
                    "Activar protocolo de seguridad",
                    "Buscar apoyo profesional o red de apoyo de forma inmediata.",
                    "Inmediato",
                    "Usuario y profesional");

            if (nivel == "Alto")
                return AccionPrioritaria(
                    "Priorizar cita psicologica",
                    recomendaciones.FirstOrDefault() ??
                    "Agendar seguimiento psicologico prioritario.",
                    "24-48 horas",
                    "Usuario / psicologo");

            if (tendencia.Estado == "Deterioro")
                return AccionPrioritaria(
                    "Revisar detonantes recientes",
                    "Aumentar registro emocional y observar eventos asociados al descenso.",
                    "Esta semana",
                    "Usuario");

            if (confianza < 55)
                return AccionPrioritaria(
                    "Mejorar calidad de senal",
                    "Completar PHQ-9, estres laboral y registros emocionales recientes.",
                    "Hoy",
                    "Usuario");

            if (diasSinRegistro >= 7)
                return AccionPrioritaria(
                    "Reactivar seguimiento",
                    "Registrar estado emocional para recuperar continuidad del monitoreo.",
                    "Hoy",
                    "Usuario");

            return AccionPrioritaria(
                "Mantener monitoreo preventivo",
                "Continuar registros y repetir evaluaciones segun evolucion.",
                "Semanal",
                "Usuario");
        }

        private static object AlertaSeguridad(
            TestPHQ9? phq9,
            string nivel)
        {
            if (phq9?.P9 > 0)
                return new
                {
                    activa = true,
                    nivel = "Critica",
                    mensaje =
                        "PHQ-9 P9 positiva. Requiere atencion humana inmediata.",
                    accion =
                        "Contactar profesional, red de apoyo o servicios de emergencia si existe riesgo actual."
                };

            if (nivel == "Alto")
                return new
                {
                    activa = true,
                    nivel = "Alta",
                    mensaje =
                        "Score elevado sin indicador critico directo.",
                    accion =
                        "Priorizar seguimiento psicologico y revisar factores detonantes."
                };

            return new
            {
                activa = false,
                nivel,
                mensaje =
                    "Sin alerta de seguridad critica con los datos disponibles.",
                accion =
                    "Mantener monitoreo y completar registros."
            };
        }

        private static object AuditoriaModelo(
            TestPHQ9? phq9,
            TestEstresLaboral? estresLaboral,
            RegistrosEmocionales? ultimoRegistro,
            IReadOnlyList<RegistrosEmocionales> registros,
            int reglasActivadas,
            int protectoresDetectados,
            int banderasDetectadas)
        {
            var entradas = new List<string>();

            if (phq9 != null) entradas.Add("PHQ-9");
            if (estresLaboral != null) entradas.Add("Estres laboral");
            if (ultimoRegistro != null) entradas.Add("Ultimo registro emocional");
            if (registros.Count > 0) entradas.Add($"Historial emocional ({registros.Count})");

            return new
            {
                version = VersionModelo,
                modalidad = "Reglas locales explicables",
                entradasUsadas = entradas,
                reglasActivadas,
                protectoresDetectados,
                banderasDetectadas,
                ventanaAnalisis = "Hasta 14 dias de registros recientes",
                limitacion =
                    "Herramienta de apoyo y priorizacion; no sustituye evaluacion psicologica profesional."
            };
        }

        private static dynamic CalcularIndiceBienestar(
            int score,
            int confianza,
            TendenciaEmocional tendencia,
            VolatilidadEmocional volatilidad,
            int protectores)
        {
            var bienestar =
                100 - score;

            if (tendencia.Estado == "Mejora") bienestar += 8;
            if (tendencia.Estado == "Deterioro") bienestar -= 10;
            if (volatilidad.Indice >= 70) bienestar -= 8;
            else if (volatilidad.Indice <= 25 && volatilidad.Indice > 0) bienestar += 4;
            bienestar += Math.Min(10, protectores * 3);
            if (confianza < 45) bienestar -= 6;

            bienestar =
                Math.Clamp(bienestar, 0, 100);

            var nivel =
                bienestar >= 78 ? "Favorable" :
                bienestar >= 58 ? "Vigilancia preventiva" :
                bienestar >= 38 ? "Comprometido" :
                "Prioritario";

            var interpretacion =
                nivel == "Favorable"
                    ? "Indicadores actuales sugieren estabilidad con monitoreo preventivo."
                    : nivel == "Vigilancia preventiva"
                        ? "Hay senales que conviene observar para evitar deterioro."
                        : nivel == "Comprometido"
                            ? "Se recomienda seguimiento cercano y completar contexto."
                            : "Se recomienda priorizar apoyo humano y revision profesional.";

            return new
            {
                Puntaje = bienestar,
                Nivel = nivel,
                Interpretacion = interpretacion
            };
        }

        private static object ConstruirDecisionClinica(
            string nivel,
            object perfilClinico,
            object trayectoriaRiesgo,
            object accionPrioritaria,
            int banderas,
            int confianza)
        {
            var tipoPerfil =
                perfilClinico.GetType()
                    .GetProperty("tipo")
                    ?.GetValue(perfilClinico)
                    ?.ToString() ?? "Sin perfil";

            var trayectoria =
                trayectoriaRiesgo.GetType()
                    .GetProperty("estado")
                    ?.GetValue(trayectoriaRiesgo)
                    ?.ToString() ?? "Sin trayectoria";

            var accion =
                accionPrioritaria.GetType()
                    .GetProperty("titulo")
                    ?.GetValue(accionPrioritaria)
                    ?.ToString() ?? "Revisar seguimiento";

            var decision =
                nivel == "Critico" ? "Seguridad inmediata" :
                nivel == "Alto" ? "Prioridad alta" :
                nivel == "Medio" || banderas >= 2 ? "Seguimiento cercano" :
                confianza < 55 ? "Completar datos" :
                "Monitoreo preventivo";

            return new
            {
                nivelDecision = decision,
                resumen =
                    $"{decision}: {tipoPerfil} con trayectoria {trayectoria.ToLower()}.",
                razon =
                    $"Decision basada en nivel {nivel}, {banderas} banderas clinicas y confianza {confianza}%.",
                siguientePaso = accion
            };
        }

        private static object ConstruirMatrizIntervencion(
            string nivel,
            object trayectoriaRiesgo,
            object accionPrioritaria,
            int confianza)
        {
            var trayectoria =
                trayectoriaRiesgo.GetType()
                    .GetProperty("estado")
                    ?.GetValue(trayectoriaRiesgo)
                    ?.ToString() ?? "Sin trayectoria";

            var accion =
                accionPrioritaria.GetType()
                    .GetProperty("detalle")
                    ?.GetValue(accionPrioritaria)
                    ?.ToString() ?? "Continuar seguimiento.";

            if (nivel == "Critico")
                return Matriz(
                    "Crisis / seguridad",
                    "Reducir riesgo inmediato y activar apoyo humano.",
                    "Contacto profesional, red de apoyo o emergencia si existe riesgo actual.",
                    "Revision inmediata y registro posterior del evento.",
                    "Cualquier ideacion autolesiva activa o perdida de control.");

            if (nivel == "Alto")
                return Matriz(
                    "Prioridad alta",
                    "Acelerar contacto profesional y reducir detonantes.",
                    accion,
                    "Seguimiento en 24-48 horas y registro diario.",
                    "Aumento de score, deterioro o banderas de seguridad.");

            if (nivel == "Medio" || trayectoria == "Vigilancia cercana")
                return Matriz(
                    "Seguimiento cercano",
                    "Evitar deterioro y completar contexto emocional.",
                    accion,
                    "Revision semanal, registro 4 veces por semana.",
                    "Deterioro sostenido, alta volatilidad o baja adherencia.");

            if (confianza < 55)
                return Matriz(
                    "Datos insuficientes",
                    "Mejorar calidad de senal antes de priorizar.",
                    "Completar evaluaciones y registros recientes.",
                    "Revisar despues de completar linea base.",
                    "Persistencia de datos incompletos con malestar alto.");

            return Matriz(
                "Prevencion",
                "Mantener bienestar y detectar cambios tempranos.",
                accion,
                "Registro 3 veces por semana y evaluaciones periodicas.",
                "Cambio brusco de animo, estres o tendencia ascendente.");
        }

        private static object Matriz(
            string nivel,
            string objetivo,
            string intervencion,
            string seguimiento,
            string criterioEscalamiento)
        {
            return new
            {
                nivel,
                objetivo,
                intervencion,
                seguimiento,
                criterioEscalamiento
            };
        }

        private static string[] PreguntasSeguimiento(
            object perfilClinico,
            object trayectoriaRiesgo,
            string nivel,
            int confianza)
        {
            var tipoPerfil =
                perfilClinico.GetType()
                    .GetProperty("tipo")
                    ?.GetValue(perfilClinico)
                    ?.ToString() ?? "";

            var direccion =
                trayectoriaRiesgo.GetType()
                    .GetProperty("direccion")
                    ?.GetValue(trayectoriaRiesgo)
                    ?.ToString() ?? "";

            var preguntas =
                new List<string>();

            if (nivel == "Critico" || nivel == "Alto")
            {
                preguntas.Add("¿Cuentas ahora con una persona de confianza o profesional a quien puedas contactar?");
                preguntas.Add("¿Hay alguna situacion inmediata que incremente tu riesgo o malestar?");
            }

            if (tipoPerfil.Contains("estres", StringComparison.OrdinalIgnoreCase) ||
                tipoPerfil.Contains("Sobrecarga", StringComparison.OrdinalIgnoreCase))
            {
                preguntas.Add("¿Que actividad, persona o contexto esta elevando mas tu estres esta semana?");
            }

            if (tipoPerfil.Contains("Animo", StringComparison.OrdinalIgnoreCase) ||
                tipoPerfil.Contains("Deterioro", StringComparison.OrdinalIgnoreCase))
            {
                preguntas.Add("¿Desde cuando notas este cambio en tu estado de animo?");
            }

            if (direccion == "Ascendente")
            {
                preguntas.Add("¿Que cambio reciente podria explicar que el riesgo este aumentando?");
            }

            if (confianza < 55)
            {
                preguntas.Add("¿Puedes completar hoy el registro emocional y evaluaciones pendientes?");
            }

            preguntas.Add("¿Que accion pequena y realista puedes realizar antes de terminar el dia?");

            return preguntas
                .Distinct()
                .Take(4)
                .ToArray();
        }

        private static object SenalDominante(List<object> factores)
        {
            if (!factores.Any())
                return new
                {
                    fuente = "Sin senal dominante",
                    peso = 0,
                    severidad = "Bajo"
                };

            var dominante =
                factores
                    .Select(x => new
                    {
                        fuente =
                            x.GetType().GetProperty("fuente")?.GetValue(x)?.ToString() ??
                            "Factor",
                        peso =
                            x.GetType().GetProperty("peso")?.GetValue(x) as int? ?? 0,
                        severidad =
                            x.GetType().GetProperty("severidad")?.GetValue(x)?.ToString() ??
                            "Sin clasificar"
                    })
                    .OrderByDescending(x => Math.Abs(x.peso))
                    .First();

            return dominante;
        }

        private static object Perfil(
            string tipo,
            string descripcion,
            string foco)
        {
            return new
            {
                tipo,
                descripcion,
                foco
            };
        }

        private static object AccionPrioritaria(
            string titulo,
            string detalle,
            string plazo,
            string responsable)
        {
            return new
            {
                titulo,
                detalle,
                plazo,
                responsable
            };
        }

        private static int Normalizar(int valor, int maximo)
        {
            if (maximo <= 0)
                return 0;

            return Math.Clamp(
                (int)Math.Round((valor / (double)maximo) * 100),
                0,
                100);
        }

        private static object Factor(
            string fuente,
            string descripcion,
            int peso,
            string severidad)
        {
            return new
            {
                fuente,
                descripcion,
                peso,
                severidad
            };
        }

        private static object Bandera(
            string tipo,
            string descripcion,
            string severidad)
        {
            return new
            {
                tipo,
                descripcion,
                severidad
            };
        }

        private sealed record TendenciaEmocional(
            string Estado,
            double Delta,
            double BalanceInicial,
            double BalanceReciente,
            int Muestras);

        private sealed record VolatilidadEmocional(
            int Indice,
            string Nivel,
            string Interpretacion);

        private sealed record CalidadDatos(
            int Porcentaje,
            string Nivel,
            string Interpretacion,
            string[] Faltantes);

        private sealed record FactoresProtectores(
            int ReduccionScore,
            IReadOnlyList<object> Items);
    }
}
