/* ==========================================================
   MINDCARE DASHBOARD PREMIUM FINAL
   dashboard.js COMPLETO
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
REGISTROS EMOCIONALES
========================================================== */
async function cargarRegistros() {

    try {

        const res =
            await fetch(
                `${API}/RegistrosEmocionales/${usuarioId}?t=${Date.now()}`
            );

        const datos =
            await res.json();

        if (!datos || !datos.length) {

            texto("ultimoRegistro", "Sin registros");
            texto("promedioResultado", "Sin datos");
            texto("iaResultado", "Sin análisis");
            texto("alertaBox", "Sin alertas");
            return;
        }

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

    } catch {

        texto("iaResultado", "Error");
    }
}

/* ==========================================================
TESTS PHQ9 + ESTRÉS
========================================================== */
async function cargarTests() {

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

    } catch {

        texto("phq9Box", "Sin test");
    }
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

    } catch {

        texto("historialPredictivo", "Sin datos");
    }
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

    } catch {

        texto("citaBox", "Sin citas");
    }
}

/* ==========================================================
ALERTA + IA
========================================================== */
function analizarEstado(a, e) {

    let alerta =
        "✅ Estado estable.";

    if (a <= 4 && e >= 7)
        alerta = "🚨 Riesgo emocional alto";

    else if (e >= 7)
        alerta = "⚠ Estrés elevado";

    else if (a <= 5)
        alerta = "⚠ Ánimo bajo";

    else if (a >= 8 && e <= 3)
        alerta = "🌟 Excelente estabilidad";

    texto("alertaBox", alerta);

    return alerta;
}

function consejoIA(a, e) {

    if (e >= 7)
        return "Reduce carga mental y descansa.";

    if (a <= 5)
        return "Busca apoyo emocional.";

    return "Mantén hábitos positivos.";
}

/* ==========================================================
GRAFICA LINEA PREMIUM
========================================================== */
function crearGraficaLinea(datos) {

    const c =
        document.getElementById("graficaLineas");

    if (!c || typeof Chart === "undefined")
        return;

    if (g1) g1.destroy();

    const ult =
        datos.slice(-7);

    g1 =
        new Chart(c, {
            type: "line",
            data: {
                labels:
                    ult.map((x, i) =>
                        "Registro " + (i + 1)
                    ),
                datasets: [
                    {
                        label: "Ánimo",
                        data:
                            ult.map(x => x.nivelAnimo),
                        borderColor: "#2563eb",
                        backgroundColor: "rgba(37,99,235,.15)",
                        fill: true,
                        tension: .45,
                        borderWidth: 4,
                        pointRadius: 5
                    },
                    {
                        label: "Estrés",
                        data:
                            ult.map(x => x.nivelEstres),
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239,68,68,.12)",
                        fill: true,
                        tension: .45,
                        borderWidth: 4,
                        pointRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 2200
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10
                    }
                }
            }
        });
}

/* ==========================================================
DONA PREMIUM
========================================================== */
function crearGraficaDona(datos) {

    const c =
        document.getElementById("graficaCategorias");

    if (!c || typeof Chart === "undefined")
        return;

    if (g2) g2.destroy();

    const mapa = {};

    datos.forEach(x => {
        mapa[x.categoria] =
            (mapa[x.categoria] || 0) + 1;
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
                cutout: "68%",
                responsive: true,
                animation: {
                    duration: 2200
                }
            }
        });
}

/* ==========================================================
BARRAS TESTS
========================================================== */
function crearGraficaComparativa(phq, est) {

    const c =
        document.getElementById("graficaTests");

    if (!c || typeof Chart === "undefined")
        return;

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
                    borderRadius: 14
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                animation: {
                    duration: 1800
                }
            }
        });
}

/* ==========================================================
RADAR CLÍNICO
========================================================== */
function crearGraficaNivel(phq, est) {

    const c =
        document.getElementById("graficaNivel");

    if (!c || typeof Chart === "undefined")
        return;

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
                    label: "Perfil Mental",
                    data: [
                        phq,
                        est / 3,
                        10 - phq / 3,
                        8,
                        est / 8
                    ],
                    backgroundColor:
                        "rgba(99,102,241,.25)",
                    borderColor: "#6366f1",
                    borderWidth: 3,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        min: 0,
                        max: 10,
                        ticks: {
                            stepSize: 2,
                            backdropColor: "transparent"
                        }
                    }
                },
                animation: {
                    duration: 2400
                }
            }
        });
}

/* ==========================================================
RESULTADOS CLÍNICOS
========================================================== */
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

/* ========================================================== */
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

    if (el)
        el.innerText = v;
}

/* ==========================================================
PDF PREMIUM ULTRA ELEGANTE
REEMPLAZA SOLO TU FUNCIÓN generarPDF()
========================================================== */

window.generarPDF = function () {

    if (!window.jspdf) {
        alert("No cargó jsPDF");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    /* ======================================================
       DATOS
    ====================================================== */

    let nombre =
        document.getElementById("bienvenida")
            ?.innerText || "Usuario";

    nombre =
        nombre
            .replace("Hola,", "")
            .replace("Hola", "")
            .trim();

    const ia =
        document.getElementById("iaResultado")
            ?.innerText || "-";

    const alerta =
        document.getElementById("alertaBox")
            ?.innerText || "-";

    const evaluacion =
        document.getElementById("phq9Box")
            ?.innerText || "-";

    const interpretacion =
        document.getElementById("phq9Trend")
            ?.innerText || "-";

    const promedio =
        document.getElementById("promedioResultado")
            ?.innerText || "-";

    const consejo =
        document.getElementById("consejoBox")
            ?.innerText || "-";

    const fecha =
        new Date().toLocaleString();

    /* ======================================================
       FONDO
    ====================================================== */

    doc.setFillColor(245, 248, 255);
    doc.rect(0, 0, 210, 297, "F");

    /* ======================================================
       HEADER MODERNO
    ====================================================== */

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(0, 0, 210, 42, 0, 0, "F");

    /* CÍRCULO LOGO */
    doc.setFillColor(255, 255, 255);
    doc.circle(20, 21, 9, "F");

    doc.setTextColor(37, 99, 235);
    doc.setFontSize(16);
    doc.text("🧠", 16.8, 25);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.text("MindCare", 34, 18);

    doc.setFontSize(11);
    doc.text(
        "Reporte emocional inteligente",
        34,
        27
    );

    doc.setFontSize(9);
    doc.text(
        fecha,
        34,
        34
    );

    /* ======================================================
       PERFIL USUARIO
    ====================================================== */

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 52, 182, 22, 5, 5, "F");

    doc.setDrawColor(220);
    doc.roundedRect(14, 52, 182, 22, 5, 5);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text("USUARIO", 20, 60);

    doc.setFontSize(16);
    doc.text(nombre, 20, 68);

    /* ======================================================
       TARJETAS PREMIUM
    ====================================================== */

    tarjetaPDF(doc, 14, 84, 88, 34,
        "IA GENERAL",
        ia,
        59, 130, 246);

    tarjetaPDF(doc, 108, 84, 88, 34,
        "ALERTA",
        alerta,
        239, 68, 68);

    tarjetaPDF(doc, 14, 126, 88, 34,
        "EVALUACIÓN",
        evaluacion,
        139, 92, 246);

    tarjetaPDF(doc, 108, 126, 88, 34,
        "INTERPRETACIÓN",
        interpretacion,
        16, 185, 129);

    tarjetaPDF(doc, 14, 168, 182, 28,
        "PROMEDIO EMOCIONAL",
        promedio,
        245, 158, 11);

    /* ======================================================
       CONSEJO DESTACADO
    ====================================================== */

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, 208, 182, 46, 6, 6, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("CONSEJO INTELIGENTE", 20, 220);

    doc.setFontSize(14);

    const lineas =
        doc.splitTextToSize(
            consejo,
            170
        );

    doc.text(lineas, 20, 233);

    /* ======================================================
       FOOTER
    ====================================================== */

    doc.setTextColor(120);
    doc.setFontSize(9);

    doc.text(
        "MindCare © Plataforma Digital de Bienestar",
        14,
        288
    );

    doc.text(
        "www.mindcare.app",
        150,
        288
    );

    doc.save(
        "MindCare_Reporte_Premium.pdf"
    );
};

/* ==========================================================
TARJETAS BONITAS
========================================================== */

function tarjetaPDF(
    doc,
    x,
    y,
    w,
    h,
    titulo,
    valor,
    r,
    g,
    b
) {

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, h, 5, 5, "F");

    doc.setDrawColor(225);
    doc.roundedRect(x, y, w, h, 5, 5);

    doc.setFillColor(r, g, b);
    doc.roundedRect(x + 3, y + 3, 4, h - 6, 2, 2, "F");

    doc.setTextColor(100);
    doc.setFontSize(9);
    doc.text(titulo, x + 12, y + 10);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);

    const txt =
        doc.splitTextToSize(
            valor,
            w - 16
        );

    doc.text(
        txt,
        x + 12,
        y + 22
    );
}
/* ==========================================================
NAVEGACIÓN
========================================================== */
function inicio() {
    location.href = "dashboard.html";
}

function irTest() {
    location.href = "test.html";
}

function irRegistro() {
    location.href = "registroEmocional.html";
}

function irPsicologos() {
    location.href = "psicologos.html";
}

function logout() {

    localStorage.clear();
    location.href = "login.html";

}