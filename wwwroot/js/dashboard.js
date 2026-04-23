/* =========================================================
   MINDCARE PREMIUM IA + GRAFICAS ANIMADAS
   Reemplaza TODO dashboard.js
========================================================= */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

const usuarioId =
    localStorage.getItem("usuarioId");

let graficaEstados = null;
let graficaCategorias = null;
let graficaTests = null;

/* ========================================================= */
window.onload = iniciarDashboard;
window.onpageshow = iniciarDashboard;

/* ========================================================= */
async function iniciarDashboard() {

    if (!usuarioId) {
        location.href = "login.html";
        return;
    }

    const nombre =
        localStorage.getItem("nombre") || "Usuario";

    texto(
        "bienvenida",
        "Hola, " + nombre.split(" ")[0]
    );

    await Promise.all([
        cargarRegistros(),
        cargarEvaluaciones(),
        cargarHistorial(),
        cargarCita()
    ]);
}

/* =========================================================
REGISTRO EMOCIONAL
========================================================= */
async function cargarRegistros() {

    try {

        const res =
            await fetch(
                `${API}/RegistrosEmocionales/${usuarioId}?t=${Date.now()}`
            );

        const datos =
            await res.json();

        if (!datos || !datos.length) {

            texto("promedioResultado", "Sin datos");
            texto("ultimoRegistro", "Sin registros");
            texto("iaResultado", "Sin análisis");
            texto("consejoBox", "Registra emociones.");
            return;
        }

        datos.sort((a, b) =>
            new Date(a.fecha) -
            new Date(b.fecha)
        );

        const ultimo =
            datos[datos.length - 1];

        texto(
            "ultimoRegistro",
            `${ultimo.categoria} | Ánimo ${ultimo.nivelAnimo}/10`
        );

        const animo =
            promedio(datos, "nivelAnimo");

        const estres =
            promedio(datos, "nivelEstres");

        texto(
            "promedioResultado",
            `Ánimo ${animo}/10 | Estrés ${estres}/10`
        );

        /* IA EXPLICATIVA */
        let ia = "Estado estable.";

        if (animo <= 4 && estres >= 7)
            ia = "Riesgo emocional alto detectado.";
        else if (animo <= 5)
            ia = "Ánimo bajo constante.";
        else if (estres >= 7)
            ia = "Estrés elevado recurrente.";
        else if (animo >= 8)
            ia = "Excelente estabilidad emocional.";

        texto("iaResultado", ia);

        texto(
            "consejoBox",
            generarConsejo(
                animo,
                estres,
                ultimo.categoria
            )
        );

        crearGraficaEstados(datos);
        crearGraficaCategorias(datos);

    } catch {

        texto("iaResultado", "Error");
    }
}

/* =========================================================
TESTS PHQ + ESTRÉS
========================================================= */
async function cargarEvaluaciones() {

    try {

        const r1 =
            await fetch(
                `${API}/TestPHQ9/${usuarioId}?t=${Date.now()}`
            );

        const phq =
            await r1.json();

        const r2 =
            await fetch(
                `${API}/TestEstresLaboral/${usuarioId}?t=${Date.now()}`
            );

        const estres =
            await r2.json();

        let totalPHQ =
            phq?.length ? phq[0].puntaje : 0;

        let totalEstres =
            estres?.length ? estres[0].puntaje : 0;

        if (totalPHQ === 0 && totalEstres === 0) {

            texto("phq9Box", "Sin test");
            texto("phq9Trend", "Sin historial");
            return;
        }

        texto(
            "phq9Box",
            `PHQ9 ${totalPHQ} | Estrés ${totalEstres}`
        );

        let explicacion = "";

        if (totalPHQ >= 15)
            explicacion += "Depresión moderada/alta. ";

        if (totalEstres >= 48)
            explicacion += "Estrés laboral importante.";

        if (!explicacion)
            explicacion = "Indicadores estables.";

        texto("phq9Trend", explicacion);

        crearGraficaTests(totalPHQ, totalEstres);

    } catch {

        texto("phq9Box", "Sin test");
    }
}

/* =========================================================
HISTORIAL IA
========================================================= */
async function cargarHistorial() {

    try {

        const res =
            await fetch(
                `${API}/HistorialPredictivo/usuario/${usuarioId}`
            );

        const lista =
            await res.json();

        if (!lista || !lista.length) {
            texto("historialPredictivo", "Sin datos");
            return;
        }

        texto(
            "historialPredictivo",
            lista[0].nivelRiesgo
        );

    } catch {

        texto("historialPredictivo", "Sin datos");
    }
}

/* =========================================================
CITAS
========================================================= */
async function cargarCita() {

    try {

        const res =
            await fetch(
                `${API}/Citas/usuario/${usuarioId}?t=${Date.now()}`
            );

        const lista =
            await res.json();

        if (!lista || !lista.length) {
            texto("citaBox", "Sin citas");
            return;
        }

        texto(
            "citaBox",
            new Date(lista[0].fecha)
                .toLocaleString()
        );

    } catch {

        texto("citaBox", "Sin citas");
    }
}

/* =========================================================
GRAFICA REGISTRO EMOCIONAL
========================================================= */
function crearGraficaEstados(datos) {

    const canvas =
        document.getElementById("graficaLineas");

    if (!canvas || typeof Chart === "undefined")
        return;

    if (graficaEstados)
        graficaEstados.destroy();

    const ultimos =
        datos.slice(-7);

    graficaEstados =
        new Chart(canvas, {
            type: "line",
            data: {
                labels:
                    ultimos.map((x, i) => "R" + (i + 1)),
                datasets: [
                    {
                        label: "Ánimo",
                        data:
                            ultimos.map(x => x.nivelAnimo),
                        tension: .4,
                        borderWidth: 4,
                        fill: false
                    },
                    {
                        label: "Estrés",
                        data:
                            ultimos.map(x => x.nivelEstres),
                        tension: .4,
                        borderWidth: 4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 1800
                }
            }
        });
}

/* =========================================================
GRAFICA CATEGORIAS
========================================================= */
function crearGraficaCategorias(datos) {

    const canvas =
        document.getElementById("graficaCategorias");

    if (!canvas || typeof Chart === "undefined")
        return;

    if (graficaCategorias)
        graficaCategorias.destroy();

    const mapa = {};

    datos.forEach(x => {
        mapa[x.categoria] =
            (mapa[x.categoria] || 0) + 1;
    });

    graficaCategorias =
        new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: Object.keys(mapa),
                datasets: [{
                    data: Object.values(mapa),
                    borderWidth: 2
                }]
            },
            options: {
                cutout: "65%",
                animation: {
                    animateRotate: true,
                    duration: 2000
                }
            }
        });
}

/* =========================================================
GRAFICA TESTS
========================================================= */
function crearGraficaTests(phq, estres) {

    const canvas =
        document.getElementById("graficaTests");

    if (!canvas || typeof Chart === "undefined")
        return;

    if (graficaTests)
        graficaTests.destroy();

    graficaTests =
        new Chart(canvas, {
            type: "bar",
            data: {
                labels: ["PHQ9", "Estrés"],
                datasets: [{
                    label: "Resultado",
                    data: [phq, estres],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 1700
                }
            }
        });
}

/* ========================================================= */
function generarConsejo(a, e, c) {

    if (a <= 4)
        return "Busca apoyo emocional y descanso.";

    if (e >= 7)
        return "Reduce carga mental y organiza tiempos.";

    if (c === "Trabajo")
        return "Separa trabajo y descanso.";

    if (c === "Escuela")
        return "Administra tareas por bloques.";

    return "Mantén hábitos saludables.";
}

/* ========================================================= */
function promedio(lista, campo) {

    let total = 0;

    lista.forEach(x =>
        total += Number(x[campo])
    );

    return (
        total / lista.length
    ).toFixed(1);
}

function texto(id, valor) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText = valor;
}

/* =========================================================
NAVEGACIÓN
========================================================= */
function inicio() { location.href = "dashboard.html"; }
function irTest() { location.href = "test.html"; }
function irRegistro() { location.href = "registroEmocional.html"; }
function irPsicologos() { location.href = "psicologos.html"; }

function logout() {
    localStorage.clear();
    location.href = "login.html";
}