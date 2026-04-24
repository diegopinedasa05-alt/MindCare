/* =====================================================
   MINDCARE DASHBOARD MASTER FINAL PRO
   SOLO SE AGREGÓ:
   ✅ cargarInfoTests()
   ✅ pintarPHQ()
   ✅ pintarEstres()
   ✅ Vista explicativa en dashboard
===================================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

const usuarioId =
    localStorage.getItem("usuarioId");

let chartLinea = null;
let chartDona = null;
let chartTests = null;
let chartRadar = null;

/* ===================================================== */
window.addEventListener("load", iniciarDashboard);
window.addEventListener("pageshow", iniciarDashboard);

/* ===================================================== */
async function iniciarDashboard() {

    if (!usuarioId) {
        location.href = "login.html";
        return;
    }

    const nombre =
        localStorage.getItem("nombre") ||
        "Usuario";

    texto(
        "bienvenida",
        "Hola, " + nombre.split(" ")[0]
    );

    await cargarTodo();
}

/* ===================================================== */
async function cargarTodo() {

    await Promise.all([
        cargarRegistros(),
        cargarPHQ9(),
        cargarHistorial(),
        cargarCita(),
        cargarInfoTests()
    ]);

}

/* =====================================================
REGISTROS
===================================================== */
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
            texto("alertaBox", "Sin alertas");
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

        const promAnimo =
            promedio(datos, "nivelAnimo");

        const promEstres =
            promedio(datos, "nivelEstres");

        texto(
            "promedioResultado",
            `Ánimo ${promAnimo}/10 | Estrés ${promEstres}/10`
        );

        if (promAnimo <= 4)
            texto("iaResultado", "Ánimo bajo detectado.");
        else if (promEstres >= 7)
            texto("iaResultado", "Estrés elevado.");
        else if (promAnimo >= 8)
            texto("iaResultado", "Excelente estabilidad.");
        else
            texto("iaResultado", "Estado emocional estable.");

        if (promAnimo <= 3 || promEstres >= 8)
            texto("alertaBox", "🚨 Riesgo alto");
        else if (promAnimo <= 5 || promEstres >= 6)
            texto("alertaBox", "⚠ Atención moderada");
        else
            texto("alertaBox", "✅ Sin alertas");

        texto(
            "consejoBox",
            consejoIA(
                promAnimo,
                promEstres,
                ultimo.categoria
            )
        );

        crearGraficas(datos);

    } catch {

        texto("iaResultado", "Error");

    }

}

/* =====================================================
TESTS
===================================================== */
async function cargarPHQ9() {

    try {

        const resPHQ =
            await fetch(
                `${API}/TestPHQ9/${usuarioId}?t=${Date.now()}`
            );

        const listaPHQ =
            await resPHQ.json();

        const resEstres =
            await fetch(
                `${API}/TestEstresLaboral/${usuarioId}?t=${Date.now()}`
            );

        const listaEstres =
            await resEstres.json();

        const phq =
            listaPHQ?.length
                ? listaPHQ[0].puntaje
                : 0;

        const estres =
            listaEstres?.length
                ? listaEstres[0].puntaje
                : 0;

        texto(
            "phq9Box",
            `PHQ9 ${phq} pts | Estrés ${estres} pts`
        );

        texto(
            "phq9Trend",
            `${nivelPHQ(phq)} | ${nivelEstres(estres)}`
        );

        crearGraficaTests(phq, estres);
        crearRadar(phq, estres);

    } catch {

        texto("phq9Box", "Sin test");

    }

}

/* ===================================================== */
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

/* ===================================================== */
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

        const cita =
            lista[0];

        texto(
            "citaBox",
            `${new Date(cita.fecha).toLocaleString()}`
        );

    } catch {

        texto("citaBox", "Sin citas");

    }

}

/* =====================================================
INFO TESTS NUEVO
===================================================== */
async function cargarInfoTests() {

    try {

        const resPHQ =
            await fetch(
                `${API}/TestPHQ9/${usuarioId}?t=${Date.now()}`
            );

        const listaPHQ =
            await resPHQ.json();

        const resEstres =
            await fetch(
                `${API}/TestEstresLaboral/${usuarioId}?t=${Date.now()}`
            );

        const listaEstres =
            await resEstres.json();

        const phq =
            listaPHQ?.length
                ? listaPHQ[0].puntaje
                : 0;

        const estres =
            listaEstres?.length
                ? listaEstres[0].puntaje
                : 0;

        pintarPHQ(phq);
        pintarEstres(estres);

    } catch {

        texto("infoPHQ9", "Sin datos");
        texto("infoEstres", "Sin datos");

    }

}

/* =====================================================
GRÁFICAS
===================================================== */
function crearGraficas(datos) {

    if (typeof Chart === "undefined")
        return;

    const c1 =
        document.getElementById("graficaLineas");

    const c2 =
        document.getElementById("graficaCategorias");

    if (!c1 || !c2)
        return;

    if (chartLinea)
        chartLinea.destroy();

    if (chartDona)
        chartDona.destroy();

    const ultimos =
        datos.slice(-7);

    chartLinea =
        new Chart(c1, {
            type: "line",
            data: {
                labels:
                    ultimos.map((_, i) =>
                        "R" + (i + 1)
                    ),
                datasets: [
                    {
                        label: "Ánimo",
                        data:
                            ultimos.map(x => x.nivelAnimo),
                        borderColor:
                            "#3b82f6",
                        backgroundColor:
                            "rgba(59,130,246,.15)",
                        fill: true,
                        tension: .4
                    },
                    {
                        label: "Estrés",
                        data:
                            ultimos.map(x => x.nivelEstres),
                        borderColor:
                            "#ef4444",
                        backgroundColor:
                            "rgba(239,68,68,.15)",
                        fill: true,
                        tension: .4
                    }
                ]
            }
        });

    const mapa = {};

    datos.forEach(x => {
        mapa[x.categoria] =
            (mapa[x.categoria] || 0) + 1;
    });

    chartDona =
        new Chart(c2, {
            type: "doughnut",
            data: {
                labels:
                    Object.keys(mapa),
                datasets: [{
                    data:
                        Object.values(mapa),
                    backgroundColor: [
                        "#3b82f6",
                        "#8b5cf6",
                        "#f43f5e",
                        "#14b8a6"
                    ]
                }]
            }
        });

}

/* ===================================================== */
function crearGraficaTests(phq, estres) {

    const c =
        document.getElementById("graficaTests");

    if (!c) return;

    if (chartTests)
        chartTests.destroy();

    chartTests =
        new Chart(c, {
            type: "bar",
            data: {
                labels: ["PHQ9", "Estrés"],
                datasets: [{
                    data: [phq, estres],
                    backgroundColor: [
                        "#8b5cf6",
                        "#ef4444"
                    ]
                }]
            }
        });
}

/* ===================================================== */
function crearRadar(phq, estres) {

    const c =
        document.getElementById("graficaRadar");

    if (!c) return;

    if (chartRadar)
        chartRadar.destroy();

    chartRadar =
        new Chart(c, {
            type: "radar",
            data: {
                labels: [
                    "PHQ9",
                    "Estrés",
                    "Ánimo",
                    "Equilibrio",
                    "Riesgo"
                ],
                datasets: [{
                    label: "Perfil emocional",
                    data: [
                        phq,
                        estres / 6,
                        8,
                        7,
                        phq >= 10 ? 8 : 4
                    ],
                    borderColor: "#3b82f6",
                    backgroundColor:
                        "rgba(59,130,246,.25)"
                }]
            }
        });
}

/* ===================================================== */
function pintarPHQ(p) {

    const el =
        document.getElementById("infoPHQ9");

    if (!el) return;

    el.innerHTML = `
    <b>Puntaje actual:</b> ${p}<br><br>
    ≤4 Sin depresión<br>
    5-14 Revisión clínica<br>
    ≥15 Tratamiento recomendado
    `;
}

/* ===================================================== */
function pintarEstres(p) {

    const el =
        document.getElementById("infoEstres");

    if (!el) return;

    el.innerHTML = `
    <b>Puntaje actual:</b> ${p}<br><br>
    ≤12 Sin estrés<br>
    13-24 Alarma<br>
    25-36 Leve<br>
    37-48 Medio<br>
    49-60 Alto<br>
    61+ Grave
    `;
}

/* ===================================================== */
function nivelPHQ(p) {

    if (p <= 4) return "PHQ9 mínimo";
    if (p <= 9) return "PHQ9 leve";
    if (p <= 14) return "PHQ9 moderado";
    return "PHQ9 alto";
}

function nivelEstres(p) {

    if (p <= 12) return "Estrés bajo";
    if (p <= 24) return "Estrés alarma";
    if (p <= 36) return "Estrés leve";
    if (p <= 48) return "Estrés medio";
    return "Estrés alto";
}

/* ===================================================== */
function consejoIA(a, e, c) {

    if (a <= 4)
        return "Busca apoyo emocional.";

    if (e >= 7)
        return "Reduce carga mental.";

    if (c === "Trabajo")
        return "Organiza tiempos.";

    if (c === "Familia")
        return "Comunica emociones.";

    return "Mantén hábitos positivos.";
}

/* ===================================================== */
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

/* ===================================================== */
function inicio() { location.href = "dashboard.html"; }
function irTest() { location.href = "test.html"; }
function irRegistro() { location.href = "registroEmocional.html"; }
function irPsicologos() { location.href = "psicologos.html"; }

function logout() {
    localStorage.clear();
    location.href = "login.html";
}