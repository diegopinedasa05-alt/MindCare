/* ==========================================================
   MINDCARE DASHBOARD ULTRA PRO 2026
   ✔ PDF definitivo
   ✔ Gráficas premium
   ✔ PHQ9 + Estrés visual
   ✔ Diseño moderno
========================================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

const usuarioId =
    localStorage.getItem("usuarioId");

let g1 = null, g2 = null, g3 = null, g4 = null;

/* ========================================================== */
window.onload = iniciarDashboard;
window.onpageshow = iniciarDashboard;

/* ========================================================== */
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
        cargarTests(),
        cargarHistorial(),
        cargarCita()
    ]);
}

/* ==========================================================
REGISTROS
========================================================== */
async function cargarRegistros() {

    try {

        const res =
            await fetch(
                `${API}/RegistrosEmocionales/${usuarioId}?t=${Date.now()}`
            );

        const datos =
            await res.json();

        if (!datos || !datos.length) return;

        datos.sort((a, b) =>
            new Date(a.fecha) - new Date(b.fecha)
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

        texto(
            "iaResultado",
            analizarEstado(animo, estres)
        );

        texto(
            "consejoBox",
            consejoIA(animo, estres)
        );

        crearGraficaLinea(datos);
        crearGraficaDona(datos);

    } catch { }
}

/* ==========================================================
TESTS
========================================================== */
async function cargarTests() {

    try {

        const r1 =
            await fetch(`${API}/TestPHQ9/${usuarioId}`);

        const phq =
            await r1.json();

        const r2 =
            await fetch(`${API}/TestEstresLaboral/${usuarioId}`);

        const est =
            await r2.json();

        const p1 =
            phq?.length ? phq[0].puntaje : 0;

        const p2 =
            est?.length ? est[0].puntaje : 0;

        texto(
            "phq9Box",
            `PHQ9 ${p1} pts | Estrés ${p2} pts`
        );

        texto(
            "phq9Trend",
            explicarResultados(p1, p2)
        );

        crearGraficaComparativa(p1, p2);
        crearGraficaNivel(p1, p2);

    } catch { }
}

/* ========================================================== */
async function cargarHistorial() {

    try {

        const res =
            await fetch(
                `${API}/HistorialPredictivo/usuario/${usuarioId}`
            );

        const data =
            await res.json();

        texto(
            "historialPredictivo",
            data?.length
                ? data[0].nivelRiesgo
                : "Sin datos"
        );

    } catch { }
}

/* ========================================================== */
async function cargarCita() {

    try {

        const res =
            await fetch(
                `${API}/Citas/usuario/${usuarioId}`
            );

        const data =
            await res.json();

        texto(
            "citaBox",
            data?.length
                ? new Date(data[0].fecha)
                    .toLocaleString()
                : "Sin citas"
        );

    } catch { }
}

/* ==========================================================
GRAFICA LINEA PREMIUM
========================================================== */
function crearGraficaLinea(datos) {

    const c =
        document.getElementById("graficaLineas");

    if (!c || typeof Chart === "undefined") return;

    if (g1) g1.destroy();

    const ult =
        datos.slice(-7);

    g1 =
        new Chart(c, {
            type: "line",
            data: {
                labels:
                    ult.map((x, i) => "R" + (i + 1)),
                datasets: [
                    {
                        label: "Ánimo",
                        data: ult.map(x => x.nivelAnimo),
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59,130,246,.2)",
                        tension: .45,
                        borderWidth: 4,
                        fill: true
                    },
                    {
                        label: "Estrés",
                        data: ult.map(x => x.nivelEstres),
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239,68,68,.2)",
                        tension: .45,
                        borderWidth: 4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                animation: { duration: 2000 }
            }
        });
}

/* ==========================================================
DONA PREMIUM
========================================================== */
function crearGraficaDona(datos) {

    const c =
        document.getElementById("graficaCategorias");

    if (!c || typeof Chart === "undefined") return;

    if (g2) g2.destroy();

    const mapa = {};

    datos.forEach(x => {
        mapa[x.categoria] = (mapa[x.categoria] || 0) + 1;
    });

    g2 =
        new Chart(c, {
            type: "doughnut",
            data: {
                labels: Object.keys(mapa),
                datasets: [{
                    data: Object.values(mapa),
                    backgroundColor: [
                        "#3b82f6",
                        "#8b5cf6",
                        "#10b981",
                        "#f59e0b",
                        "#ef4444"
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: "70%",
                animation: { duration: 2200 }
            }
        });
}

/* ==========================================================
COMPARATIVA TESTS
========================================================== */
function crearGraficaComparativa(phq, est) {

    const c =
        document.getElementById("graficaTests");

    if (!c || typeof Chart === "undefined") return;

    if (g3) g3.destroy();

    g3 =
        new Chart(c, {
            type: "bar",
            data: {
                labels: ["PHQ9", "Estrés"],
                datasets: [{
                    data: [phq, est],
                    backgroundColor: [
                        "#8b5cf6",
                        "#ef4444"
                    ],
                    borderRadius: 12
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                animation: { duration: 1800 }
            }
        });
}

/* ==========================================================
NIVEL CLÍNICO
========================================================== */
function crearGraficaNivel(phq, est) {

    const c =
        document.getElementById("graficaNivel");

    if (!c || typeof Chart === "undefined") return;

    if (g4) g4.destroy();

    g4 =
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
                        est / 3,
                        10 - phq / 3,
                        8,
                        est / 8
                    ],
                    backgroundColor: "rgba(59,130,246,.3)",
                    borderColor: "#3b82f6",
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: { beginAtZero: true }
                },
                animation: { duration: 2200 }
            }
        });
}

/* ========================================================== */
function analizarEstado(a, e) {

    if (a >= 8 && e <= 3)
        return "Excelente estabilidad.";

    if (a <= 4 && e >= 7)
        return "Riesgo emocional alto.";

    if (e >= 7)
        return "Estrés elevado.";

    if (a <= 5)
        return "Ánimo bajo.";

    return "Estado estable.";
}

function consejoIA(a, e) {

    if (e >= 7)
        return "Descansa y reduce carga.";

    if (a <= 5)
        return "Busca apoyo emocional.";

    return "Mantén hábitos positivos.";
}

function explicarResultados(phq, est) {

    let t1 =
        phq <= 4 ? "PHQ9 mínimo"
            : phq <= 9 ? "PHQ9 leve"
                : phq <= 14 ? "PHQ9 moderado"
                    : "PHQ9 alto";

    let t2 =
        est <= 24 ? "Estrés bajo"
            : est <= 48 ? "Estrés medio"
                : "Estrés alto";

    return t1 + " | " + t2;
}

function promedio(lista, campo) {

    let total = 0;

    lista.forEach(x =>
        total += Number(x[campo])
    );

    return (
        total / lista.length
    ).toFixed(1);
}

function texto(id, v) {

    const el =
        document.getElementById(id);

    if (el) el.innerText = v;
}

/* ==========================================================
PDF DEFINITIVO
========================================================== */
window.generarPDF = function () {

    if (!window.jspdf) {
        alert("No cargó jsPDF");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text("MindCare Reporte Clínico", 20, 20);

    doc.setFontSize(12);

    doc.text(
        document.getElementById("bienvenida").innerText,
        20, 40
    );

    doc.text(
        "IA: " +
        document.getElementById("iaResultado").innerText,
        20, 55
    );

    doc.text(
        "Tests: " +
        document.getElementById("phq9Box").innerText,
        20, 70
    );

    doc.text(
        "Interpretación:",
        20, 90
    );

    doc.text(
        document.getElementById("phq9Trend").innerText,
        20, 102
    );

    doc.save("MindCare_Reporte.pdf");
};

/* ========================================================== */
function inicio() { location.href = "dashboard.html"; }
function irTest() { location.href = "test.html"; }
function irRegistro() { location.href = "registroEmocional.html"; }
function irPsicologos() { location.href = "psicologos.html"; }

function logout() {
    localStorage.clear();
    location.href = "login.html";
}