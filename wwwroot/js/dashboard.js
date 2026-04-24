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
SOLO REEMPLAZA TU FUNCIÓN generarPDF()
NO TOQUES NADA MÁS
✔ quita símbolos raros
✔ agrega interpretación clínica por puntos
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
        limpiar(
            document.getElementById("iaResultado")
                ?.innerText || "-"
        );

    const alerta =
        limpiar(
            document.getElementById("alertaBox")
                ?.innerText || "-"
        );

    const evaluacion =
        limpiar(
            document.getElementById("phq9Box")
                ?.innerText || "-"
        );

    const interpretacion =
        limpiar(
            document.getElementById("phq9Trend")
                ?.innerText || "-"
        );

    const promedio =
        limpiar(
            document.getElementById("promedioResultado")
                ?.innerText || "-"
        );

    const consejo =
        limpiar(
            document.getElementById("consejoBox")
                ?.innerText || "-"
        );

    const fecha =
        new Date().toLocaleString();

    /* ======================================================
       OBTENER PUNTOS
    ====================================================== */

    const phq =
        extraerNumero(
            evaluacion,
            "PHQ9"
        );

    const estres =
        extraerNumero(
            evaluacion,
            "Estrés"
        );

    const detallePHQ =
        interpretarPHQ(phq);

    const detalleEstres =
        interpretarEstres(estres);

    /* ======================================================
       FONDO
    ====================================================== */

    doc.setFillColor(245, 248, 255);
    doc.rect(0, 0, 210, 297, "F");

    /* ======================================================
       HEADER
    ====================================================== */

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("MindCare", 14, 16);

    doc.setFontSize(10);
    doc.text(
        "Reporte emocional inteligente",
        14,
        24
    );

    doc.text(
        fecha,
        14,
        31
    );

    /* ======================================================
       USUARIO
    ====================================================== */

    caja(doc, 14, 48, 182, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("USUARIO", 18, 55);

    doc.setFontSize(15);
    doc.setTextColor(20);
    doc.text(nombre, 18, 62);

    /* ======================================================
       TARJETAS
    ====================================================== */

    mini(doc, 14, 74, 88, 28, "IA GENERAL", ia);
    mini(doc, 108, 74, 88, 28, "ALERTA", alerta);

    mini(doc, 14, 108, 88, 28, "EVALUACIÓN", evaluacion);
    mini(doc, 108, 108, 88, 28, "INTERPRETACIÓN", interpretacion);

    mini(doc, 14, 142, 182, 24, "PROMEDIO", promedio);

    /* ======================================================
       NUEVO APARTADO TESTS
    ====================================================== */

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 176, 182, 66, 5, 5, "F");
    doc.setDrawColor(225);
    doc.roundedRect(14, 176, 182, 66, 5, 5);

    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text("Interpretación de evaluaciones", 18, 188);

    doc.setFontSize(10);
    doc.setTextColor(40);

    doc.text(
        `PHQ9 (${phq} pts): ${detallePHQ}`,
        18,
        200
    );

    doc.text(
        `Estrés (${estres} pts): ${detalleEstres}`,
        18,
        210
    );

    const recomendacion =
        sugerenciaFinal(phq, estres);

    const texto =
        doc.splitTextToSize(
            recomendacion,
            168
        );

    doc.text(
        texto,
        18,
        223
    );

    /* ======================================================
       CONSEJO
    ====================================================== */

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, 250, 182, 28, 5, 5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("CONSEJO INTELIGENTE", 18, 260);

    doc.setFontSize(12);
    doc.text(consejo, 18, 270);

    doc.save(
        "MindCare_Reporte_Premium.pdf"
    );
};

/* ======================================================
UTILIDADES
====================================================== */

function limpiar(t) {
    return t
        .replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ]/g, "")
        .trim();
}

function caja(doc, x, y, w, h) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, h, 5, 5, "F");
    doc.setDrawColor(225);
    doc.roundedRect(x, y, w, h, 5, 5);
}

function mini(doc, x, y, w, h, titulo, valor) {

    caja(doc, x, y, w, h);

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(titulo, x + 4, y + 8);

    doc.setFontSize(11);
    doc.setTextColor(20);

    const txt =
        doc.splitTextToSize(
            valor,
            w - 8
        );

    doc.text(
        txt,
        x + 4,
        y + 18
    );
}

function extraerNumero(texto, palabra) {

    const r =
        new RegExp(
            palabra + "\\s*(\\d+)",
            "i"
        );

    const m =
        texto.match(r);

    return m ? parseInt(m[1]) : 0;
}

/* ======================================================
INTERPRETACIONES
====================================================== */

function interpretarPHQ(p) {

    if (p <= 4) return "Mínimo o sin depresión.";
    if (p <= 9) return "Depresión leve.";
    if (p <= 14) return "Depresión moderada.";
    if (p <= 19) return "Depresión moderadamente severa.";
    return "Depresión severa.";
}

function interpretarEstres(p) {

    if (p <= 12) return "Sin estrés.";
    if (p <= 24) return "Fase de alarma.";
    if (p <= 36) return "Estrés leve.";
    if (p <= 48) return "Estrés medio.";
    if (p <= 60) return "Estrés alto.";
    return "Estrés grave.";
}

function sugerenciaFinal(phq, estres) {

    if (phq >= 15 || estres >= 49)
        return "Se recomienda apoyo profesional prioritario.";

    if (phq >= 10 || estres >= 37)
        return "Conviene seguimiento psicológico y manejo emocional.";

    if (phq >= 5 || estres >= 25)
        return "Se recomienda autocuidado, descanso y monitoreo.";

    return "Estado general favorable. Mantener hábitos saludables.";
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