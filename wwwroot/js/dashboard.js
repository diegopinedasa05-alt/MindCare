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
    Mayor o menor a 4 puntos Sin depresión<br>
    De 5 a 14 puntos se recomienda revisión clínica<br>
    Mayor a 15 puntos se recomienda tomar un tratamiento 
    `;
}

/* ===================================================== */
function pintarEstres(p) {

    const el =
        document.getElementById("infoEstres");

    if (!el) return;

    el.innerHTML = `
    <b>Puntaje actual:</b> ${p}<br><br>
    Menor o igual a 12 puntos sin estrés<br>
    De 13 a 24 se comienza a detectar un estrés ligero<br>
    De 25 a 36 puntos estrés medio<br>
    De 37 a 48 puntos estrés medio alto<br>
    De 49 a 60 puntos estrés alto <br>
    Mayor a 61 puntos estres grave se recomienda atención
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
/* =====================================================
PDF PREMIUM LIMPIO SIN SÍMBOLOS RAROS
REEMPLAZA TODA TU FUNCIÓN generarPDF()
===================================================== */
function generarPDF() {

    if (!window.jspdf) {
        alert("No cargó jsPDF");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    /* =========================
       DATOS
    ========================= */
    const nombre =
        (localStorage.getItem("nombre") || "Usuario")
            .replace("Hola,", "")
            .trim()
            .split(" ")[0];

    const ia =
        document.getElementById("iaResultado")?.innerText || "-";

    const alerta =
        limpiarTexto(
            document.getElementById("alertaBox")?.innerText || "-"
        );

    const test =
        limpiarTexto(
            document.getElementById("phq9Box")?.innerText || "-"
        );

    const nivel =
        limpiarTexto(
            document.getElementById("phq9Trend")?.innerText || "-"
        );

    const promedio =
        limpiarTexto(
            document.getElementById("promedioResultado")?.innerText || "-"
        );

    const consejo =
        limpiarTexto(
            document.getElementById("consejoBox")?.innerText || "-"
        );

    const fecha =
        new Date().toLocaleString("es-MX");

    /* =========================
       COLORES
    ========================= */
    const azul = [37, 99, 235];
    const gris = [248, 250, 252];
    const borde = [226, 232, 240];
    const oscuro = [15, 23, 42];
    const grisText = [100, 116, 139];

    /* =========================
       HEADER
    ========================= */
    doc.setFillColor(...azul);
    doc.rect(0, 0, 210, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("MindCare", 14, 16);

    doc.setFontSize(11);
    doc.text("Reporte emocional inteligente", 14, 25);

    doc.setFontSize(9);
    doc.text(fecha, 14, 32);

    /* =========================
       TITULO
    ========================= */
    doc.setTextColor(...oscuro);
    doc.setFontSize(18);
    doc.text("Resumen personal", 14, 50);

    let y = 58;

    /* =========================
       FUNCIÓN TARJETA
    ========================= */
    function tarjeta(titulo, valor, colorBarra = [59, 130, 246]) {

        const alto = 22;

        doc.setFillColor(...gris);
        doc.setDrawColor(...borde);
        doc.roundedRect(14, y, 182, alto, 5, 5, "FD");

        /* barra lateral */
        doc.setFillColor(...colorBarra);
        doc.roundedRect(14, y, 4, alto, 5, 5, "F");

        doc.setTextColor(...grisText);
        doc.setFontSize(9);
        doc.text(titulo.toUpperCase(), 22, y + 7);

        doc.setTextColor(...oscuro);
        doc.setFontSize(13);

        const lineas =
            doc.splitTextToSize(valor, 168);

        doc.text(lineas, 22, y + 16);

        y += alto + 8;
    }

    /* =========================
       TARJETAS
    ========================= */
    tarjeta("Usuario", nombre, [59, 130, 246]);
    tarjeta("IA General", ia, [14, 165, 233]);
    tarjeta("Alerta", alerta, [239, 68, 68]);
    tarjeta("Evaluación", test, [139, 92, 246]);
    tarjeta("Interpretación", nivel, [16, 185, 129]);
    tarjeta("Promedio", promedio, [245, 158, 11]);
    tarjeta("Consejo", consejo, [37, 99, 235]);

    /* =========================
       FOOTER
    ========================= */
    doc.setDrawColor(...borde);
    doc.line(14, 285, 196, 285);

    doc.setTextColor(...grisText);
    doc.setFontSize(9);
    doc.text(
        "MindCare © Reporte generado automáticamente",
        14,
        291
    );

    doc.save("MindCare_Reporte.pdf");
}

/* =====================================================
LIMPIAR SÍMBOLOS EXTRAÑOS
===================================================== */
function limpiarTexto(txt) {

    return txt
        .replace(/🚨|⚠|✅|❌|🧠|💼|📈|📊|📄|•/g, "")
        .replace(/\s+/g, " ")
        .trim();
}