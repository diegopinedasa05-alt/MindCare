/* =====================================================
   MINDCARE DASHBOARD MASTER FINAL PRO
   ✅ Dashboard limpio
   ✅ Citas
   ✅ PHQ9
   ✅ Historial IA
   ✅ Registros emocionales
   ✅ Gráficas
   ✅ PDF PREMIUM con logo cerebro
===================================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

const usuarioId =
    localStorage.getItem("usuarioId");

let chartLinea = null;
let chartDona = null;

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
        cargarCita()
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
            texto("analisisGrafica", "Sin datos.");
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
        analizarGrafica(datos);

    } catch {

        texto("iaResultado", "Error");

    }

}

/* =====================================================
PHQ9
===================================================== */
async function cargarPHQ9() {

    try {

        const res =
            await fetch(
                `${API}/TestPHQ9/${usuarioId}?t=${Date.now()}`
            );

        const lista =
            await res.json();

        if (!lista || !lista.length) {

            texto("phq9Box", "Sin test");
            texto("phq9Trend", "Sin historial");
            return;
        }

        const actual =
            lista[0];

        texto(
            "phq9Box",
            `${actual.puntaje} pts | ${actual.nivel}`
        );

        if (lista.length >= 2) {

            const dif =
                lista[0].puntaje -
                lista[1].puntaje;

            if (dif > 0)
                texto("phq9Trend", `⚠ Subió ${dif}`);
            else if (dif < 0)
                texto("phq9Trend", `✅ Mejoró ${Math.abs(dif)}`);
            else
                texto("phq9Trend", "Sin cambios");

        } else {

            texto("phq9Trend", "Primer test");

        }

    } catch {

        texto("phq9Box", "Sin test");

    }

}

/* =====================================================
HISTORIAL IA
===================================================== */
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

/* =====================================================
CITAS
===================================================== */
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

        lista.sort((a, b) =>
            new Date(a.fecha) -
            new Date(b.fecha)
        );

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
            type: "bar",
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
                        backgroundColor:
                            "#3b82f6"
                    },
                    {
                        label: "Estrés",
                        data:
                            ultimos.map(x => x.nivelEstres),
                        backgroundColor:
                            "#ef4444"
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
                        Object.values(mapa)
                }]
            }
        });

}

/* ===================================================== */
function analizarGrafica(datos) {

    if (!datos || datos.length < 2) {
        texto("analisisGrafica", "Sin suficientes datos.");
        return;
    }

    const ultimos =
        datos.slice(-5);

    const a =
        promedio(ultimos, "nivelAnimo");

    const e =
        promedio(ultimos, "nivelEstres");

    let msg =
        "🙂 Estado estable.";

    if (a <= 4 && e >= 7)
        msg = "🚨 Riesgo detectado.";
    else if (e >= 7)
        msg = "⚠ Estrés alto.";
    else if (a <= 5)
        msg = "⚠ Ánimo bajo.";

    texto("analisisGrafica", msg);
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

    return "Mantén hábitos saludables.";
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

/* =====================================================
NAVEGACIÓN
===================================================== */
function inicio() { location.href = "dashboard.html"; }
function irTest() { location.href = "test.html"; }
function irRegistro() { location.href = "registroEmocional.html"; }
function irPsicologos() { location.href = "psicologos.html"; }

function logout() {
    localStorage.clear();
    location.href = "login.html";
}

/* =====================================================
PDF PREMIUM CON LOGO CEREBRO
===================================================== */
async function generarPDF() {

    if (!window.jspdf) {
        alert("No cargó jsPDF");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    const nombre =
        document.getElementById("bienvenida")?.innerText || "Usuario";

    const promedioTxt =
        document.getElementById("promedioResultado")?.innerText || "-";

    const ia =
        document.getElementById("iaResultado")?.innerText || "-";

    const phq9 =
        document.getElementById("phq9Box")?.innerText || "-";

    const cita =
        document.getElementById("citaBox")?.innerText || "-";

    const alerta =
        document.getElementById("alertaBox")?.innerText || "-";

    const consejo =
        document.getElementById("consejoBox")?.innerText || "-";

    /* HEADER */
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 35, "F");

    /* LOGO CEREBRO */
    doc.setFillColor(255, 255, 255);
    doc.circle(20, 18, 8, "F");

    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("MindCare", 35, 18);

    doc.setFontSize(10);
    doc.text("Reporte emocional premium", 35, 25);

    /* TITULO */
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.text("Resumen Personal", 14, 48);

    doc.setFontSize(11);
    doc.text("Usuario: " + nombre, 14, 58);
    doc.text("Fecha: " + new Date().toLocaleString(), 14, 66);

    /* TARJETAS */
    tarjeta(doc, 14, 78, 86, 28, "Promedio", promedioTxt);
    tarjeta(doc, 110, 78, 86, 28, "IA", ia);

    tarjeta(doc, 14, 112, 86, 28, "PHQ9", phq9);
    tarjeta(doc, 110, 112, 86, 28, "Cita", cita);

    tarjeta(doc, 14, 146, 182, 28, "Alerta", alerta);

    /* CONSEJO */
    doc.setFontSize(15);
    doc.text("Consejo Inteligente", 14, 190);

    doc.setFontSize(11);
    const lineas =
        doc.splitTextToSize(consejo, 180);

    doc.text(lineas, 14, 200);

    /* FOOTER */
    doc.setDrawColor(220);
    doc.line(14, 280, 196, 280);

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
        "MindCare © Reporte generado automáticamente",
        14,
        287
    );

    doc.save("MindCare_Reporte_Premium.pdf");
}

/* ===================================================== */
function tarjeta(doc, x, y, w, h, titulo, valor) {

    doc.setDrawColor(230);
    doc.roundedRect(x, y, w, h, 4, 4);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(titulo, x + 4, y + 8);

    doc.setFontSize(11);
    doc.setTextColor(20);

    const texto =
        doc.splitTextToSize(valor, w - 8);

    doc.text(texto, x + 4, y + 18);
}