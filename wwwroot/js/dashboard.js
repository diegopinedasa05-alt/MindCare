/* =====================================================
MINDCARE DASHBOARD FINAL
✅ Citas reflejadas correctamente
✅ PHQ9
✅ Historial predictivo
✅ Registros emocionales
✅ Gráficas
===================================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

const usuarioId =
    localStorage.getItem("usuarioId");

let chartLinea = null;
let chartDona = null;

/* ===================================================== */
window.addEventListener(
    "load",
    iniciarDashboard
);

window.addEventListener(
    "pageshow",
    iniciarDashboard
);

/* ===================================================== */
async function iniciarDashboard() {

    if (!usuarioId) {

        location.href =
            "login.html";

        return;
    }

    const nombre =
        localStorage.getItem("nombre")
        || "Usuario";

    texto(
        "bienvenida",
        "Hola, " +
        nombre.split(" ")[0]
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
REGISTROS EMOCIONALES
===================================================== */
async function cargarRegistros() {

    try {

        const res =
            await fetch(
                `${API}/RegistrosEmocionales/${usuarioId}?t=${Date.now()}`
            );

        const datos =
            await res.json();

        if (!datos ||
            datos.length === 0) {

            texto(
                "promedioResultado",
                "Sin datos"
            );

            texto(
                "ultimoRegistro",
                "Sin registros"
            );

            texto(
                "iaResultado",
                "Sin análisis"
            );

            texto(
                "consejoBox",
                "Registra emociones."
            );

            texto(
                "analisisGrafica",
                "Aún no hay datos."
            );

            texto(
                "alertaBox",
                "Sin alertas"
            );

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
            promedio(
                datos,
                "nivelAnimo"
            );

        const promEstres =
            promedio(
                datos,
                "nivelEstres"
            );

        texto(
            "promedioResultado",
            `Ánimo ${promAnimo}/10 | Estrés ${promEstres}/10`
        );

        /* IA */

        if (promAnimo <= 4) {

            texto(
                "iaResultado",
                "Ánimo bajo detectado."
            );

        } else if (
            promEstres >= 7
        ) {

            texto(
                "iaResultado",
                "Estrés elevado frecuente."
            );

        } else if (
            promAnimo >= 8
        ) {

            texto(
                "iaResultado",
                "Excelente estabilidad emocional."
            );

        } else {

            texto(
                "iaResultado",
                "Estado emocional estable."
            );
        }

        /* ALERTA */

        if (
            promAnimo <= 3 ||
            promEstres >= 8
        ) {

            texto(
                "alertaBox",
                "🚨 Riesgo emocional alto"
            );

        } else if (
            promAnimo <= 5 ||
            promEstres >= 6
        ) {

            texto(
                "alertaBox",
                "⚠ Atención moderada"
            );

        } else {

            texto(
                "alertaBox",
                "✅ Sin alertas"
            );
        }

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

        texto(
            "iaResultado",
            "Error registros"
        );
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

        if (!lista ||
            !lista.length) {

            texto(
                "phq9Box",
                "Sin test"
            );

            texto(
                "phq9Trend",
                "Sin historial"
            );

            return;
        }

        const actual =
            lista[0];

        texto(
            "phq9Box",
            `${actual.puntaje} pts | ${actual.nivel}`
        );

        if (
            lista.length >= 2
        ) {

            const dif =
                lista[0].puntaje -
                lista[1].puntaje;

            if (dif > 0) {

                texto(
                    "phq9Trend",
                    `⚠ Subió ${dif} puntos`
                );

            } else if (dif < 0) {

                texto(
                    "phq9Trend",
                    `✅ Mejoró ${Math.abs(dif)} puntos`
                );

            } else {

                texto(
                    "phq9Trend",
                    "Sin cambios"
                );
            }

        } else {

            texto(
                "phq9Trend",
                "Primer test"
            );
        }

    } catch {

        texto(
            "phq9Box",
            "Sin test"
        );
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

        if (!lista ||
            !lista.length) {

            texto(
                "historialPredictivo",
                "Sin datos"
            );

            return;
        }

        texto(
            "historialPredictivo",
            lista[0].nivelRiesgo
        );

    } catch {

        texto(
            "historialPredictivo",
            "Sin datos"
        );
    }
}

/* =====================================================
🔥 CITAS CORREGIDO
===================================================== */
/* =====================================================
MINDCARE DASHBOARD FINAL
✅ Citas reflejadas correctamente
✅ PHQ9
✅ Historial predictivo
✅ Registros emocionales
✅ Gráficas
===================================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

const usuarioId =
    localStorage.getItem("usuarioId");

let chartLinea = null;
let chartDona = null;

/* ===================================================== */
window.addEventListener(
    "load",
    iniciarDashboard
);

window.addEventListener(
    "pageshow",
    iniciarDashboard
);

/* ===================================================== */
async function iniciarDashboard() {

    if (!usuarioId) {

        location.href =
            "login.html";

        return;
    }

    const nombre =
        localStorage.getItem("nombre")
        || "Usuario";

    texto(
        "bienvenida",
        "Hola, " +
        nombre.split(" ")[0]
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
REGISTROS EMOCIONALES
===================================================== */
async function cargarRegistros() {

    try {

        const res =
            await fetch(
                `${API}/RegistrosEmocionales/${usuarioId}?t=${Date.now()}`
            );

        const datos =
            await res.json();

        if (!datos ||
            datos.length === 0) {

            texto(
                "promedioResultado",
                "Sin datos"
            );

            texto(
                "ultimoRegistro",
                "Sin registros"
            );

            texto(
                "iaResultado",
                "Sin análisis"
            );

            texto(
                "consejoBox",
                "Registra emociones."
            );

            texto(
                "analisisGrafica",
                "Aún no hay datos."
            );

            texto(
                "alertaBox",
                "Sin alertas"
            );

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
            promedio(
                datos,
                "nivelAnimo"
            );

        const promEstres =
            promedio(
                datos,
                "nivelEstres"
            );

        texto(
            "promedioResultado",
            `Ánimo ${promAnimo}/10 | Estrés ${promEstres}/10`
        );

        /* IA */

        if (promAnimo <= 4) {

            texto(
                "iaResultado",
                "Ánimo bajo detectado."
            );

        } else if (
            promEstres >= 7
        ) {

            texto(
                "iaResultado",
                "Estrés elevado frecuente."
            );

        } else if (
            promAnimo >= 8
        ) {

            texto(
                "iaResultado",
                "Excelente estabilidad emocional."
            );

        } else {

            texto(
                "iaResultado",
                "Estado emocional estable."
            );
        }

        /* ALERTA */

        if (
            promAnimo <= 3 ||
            promEstres >= 8
        ) {

            texto(
                "alertaBox",
                "🚨 Riesgo emocional alto"
            );

        } else if (
            promAnimo <= 5 ||
            promEstres >= 6
        ) {

            texto(
                "alertaBox",
                "⚠ Atención moderada"
            );

        } else {

            texto(
                "alertaBox",
                "✅ Sin alertas"
            );
        }

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

        texto(
            "iaResultado",
            "Error registros"
        );
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

        if (!lista ||
            !lista.length) {

            texto(
                "phq9Box",
                "Sin test"
            );

            texto(
                "phq9Trend",
                "Sin historial"
            );

            return;
        }

        const actual =
            lista[0];

        texto(
            "phq9Box",
            `${actual.puntaje} pts | ${actual.nivel}`
        );

        if (
            lista.length >= 2
        ) {

            const dif =
                lista[0].puntaje -
                lista[1].puntaje;

            if (dif > 0) {

                texto(
                    "phq9Trend",
                    `⚠ Subió ${dif} puntos`
                );

            } else if (dif < 0) {

                texto(
                    "phq9Trend",
                    `✅ Mejoró ${Math.abs(dif)} puntos`
                );

            } else {

                texto(
                    "phq9Trend",
                    "Sin cambios"
                );
            }

        } else {

            texto(
                "phq9Trend",
                "Primer test"
            );
        }

    } catch {

        texto(
            "phq9Box",
            "Sin test"
        );
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

        if (!lista ||
            !lista.length) {

            texto(
                "historialPredictivo",
                "Sin datos"
            );

            return;
        }

        texto(
            "historialPredictivo",
            lista[0].nivelRiesgo
        );

    } catch {

        texto(
            "historialPredictivo",
            "Sin datos"
        );
    }
}

/* =====================================================
🔥 CITAS CORREGIDO
===================================================== */
async function cargarCita() {

    try {

        const res =
            await fetch(
                `${API}/Citas/usuario/${usuarioId}?t=${Date.now()}`
            );

        if (!res.ok) {
            texto("citaBox", "Sin citas");
            return;
        }

        const lista = await res.json();

        if (!lista.length) {
            texto("citaBox", "Sin citas");
            return;
        }

        lista.sort((a, b) =>
            new Date(b.fecha) -
            new Date(a.fecha)
        );

        const cita = lista[0];

        const fecha =
            new Date(cita.fecha)
                .toLocaleString();

        texto(
            "citaBox",
            `${fecha} | ${cita.estado}`
        );

    } catch {

        texto("citaBox", "Sin citas");
    }
}
/* =====================================================
GRÁFICAS
===================================================== */
function crearGraficas(datos) {

    if (
        typeof Chart ===
        "undefined"
    ) return;

    const c1 =
        document.getElementById(
            "graficaLineas"
        );

    const c2 =
        document.getElementById(
            "graficaCategorias"
        );

    if (!c1 || !c2)
        return;

    if (chartLinea)
        chartLinea.destroy();

    if (chartDona)
        chartDona.destroy();

    const ultimos =
        datos.slice(-7);

    const labels =
        ultimos.map(
            (_, i) =>
                "Registro " +
                (i + 1)
        );

    chartLinea =
        new Chart(c1, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Ánimo",
                        data:
                            ultimos.map(x =>
                                x.nivelAnimo),
                        backgroundColor:
                            "rgba(37,99,235,.8)"
                    },
                    {
                        label: "Estrés",
                        data:
                            ultimos.map(x =>
                                x.nivelEstres),
                        backgroundColor:
                            "rgba(239,68,68,.8)"
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10
                    }
                }
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

    if (
        !datos ||
        datos.length < 2
    ) {

        texto(
            "analisisGrafica",
            "Aún no hay suficientes datos."
        );

        return;
    }

    const ultimos =
        datos.slice(-5);

    const promAnimo =
        promedio(
            ultimos,
            "nivelAnimo"
        );

    const promEstres =
        promedio(
            ultimos,
            "nivelEstres"
        );

    let msg =
        "🙂 Estado estable.";

    if (
        promAnimo <= 4 &&
        promEstres >= 7
    )
        msg =
            "🚨 Riesgo emocional detectado.";

    else if (
        promEstres >= 7
    )
        msg =
            "⚠ Estrés alto reciente.";

    else if (
        promAnimo <= 5
    )
        msg =
            "⚠ Ánimo bajo reciente.";

    texto(
        "analisisGrafica",
        msg
    );
}

/* ===================================================== */
function consejoIA(
    animo,
    estres,
    cat
) {

    if (animo <= 4)
        return "Busca apoyo emocional.";

    if (estres >= 7)
        return "Reduce carga mental.";

    if (cat === "Trabajo")
        return "Organiza tiempos.";

    if (cat === "Familia")
        return "Comunica emociones.";

    return "Mantén hábitos saludables.";
}

/* ===================================================== */
function promedio(
    lista,
    campo
) {

    let total = 0;

    lista.forEach(x =>
        total += Number(
            x[campo]
        )
    );

    return (
        total /
        lista.length
    ).toFixed(1);
}

/* ===================================================== */
function texto(id, val) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText = val;
}

/* ===================================================== */
function inicio() {
    location.href =
        "dashboard.html";
}

function irTest() {
    location.href =
        "test.html";
}

function irRegistro() {
    location.href =
        "registroEmocional.html";
}

function irPsicologos() {
    location.href =
        "psicologos.html";
}

function logout() {
    localStorage.clear();
    location.href =
        "login.html";
}
/* =====================================================
   DASHBOARD PDF PRO - MindCare
   REEMPLAZA TU FUNCIÓN generarPDF()
===================================================== */

async function generarPDF() {

    if (!window.jspdf) {
        alert("No se cargó jsPDF");
        return;
    }

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF("p", "mm", "a4");

    const nombre =
        document.getElementById("bienvenida")?.innerText ||
        "Usuario";

    const promedio =
        document.getElementById("promedioResultado")?.innerText ||
        "Sin datos";

    const ia =
        document.getElementById("iaResultado")?.innerText ||
        "Sin datos";

    const phq9 =
        document.getElementById("phq9Box")?.innerText ||
        "Sin datos";

    const tendencia =
        document.getElementById("phq9Trend")?.innerText ||
        "Sin datos";

    const riesgo =
        document.getElementById("historialPredictivo")?.innerText ||
        "Sin datos";

    const cita =
        document.getElementById("citaBox")?.innerText ||
        "Sin citas";

    const alerta =
        document.getElementById("alertaBox")?.innerText ||
        "Sin alertas";

    const consejo =
        document.getElementById("consejoBox")?.innerText ||
        "Sin consejo";

    const analisis =
        document.getElementById("analisisGrafica")?.innerText ||
        "Sin análisis";

    /* =====================================
       ENCABEZADO
    ===================================== */

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("MindCare", 14, 18);

    doc.setFontSize(10);
    doc.text("Reporte emocional inteligente", 145, 18);

    /* =====================================
       DATOS GENERALES
    ===================================== */

    doc.setTextColor(30, 41, 59);

    doc.setFontSize(16);
    doc.text("Resumen general", 14, 40);

    doc.setFontSize(11);

    doc.text("Usuario:", 14, 50);
    doc.text(nombre, 45, 50);

    doc.text("Fecha:", 14, 58);
    doc.text(new Date().toLocaleString(), 45, 58);

    doc.text("Promedio:", 14, 66);
    doc.text(promedio, 45, 66);

    /* =====================================
       TARJETAS
    ===================================== */

    dibujarCaja(doc, 14, 78, 88, 28, "IA Principal", ia);
    dibujarCaja(doc, 108, 78, 88, 28, "PHQ9", phq9);

    dibujarCaja(doc, 14, 112, 88, 28, "Tendencia", tendencia);
    dibujarCaja(doc, 108, 112, 88, 28, "Riesgo", riesgo);

    dibujarCaja(doc, 14, 146, 88, 28, "Próxima cita", cita);
    dibujarCaja(doc, 108, 146, 88, 28, "Alerta", alerta);

    /* =====================================
       TEXTO IA
    ===================================== */

    doc.setFontSize(15);
    doc.text("Recomendación IA", 14, 188);

    doc.setFontSize(11);

    const consejoLines =
        doc.splitTextToSize(consejo, 180);

    doc.text(consejoLines, 14, 198);

    doc.setFontSize(15);
    doc.text("Interpretación gráfica", 14, 222);

    doc.setFontSize(11);

    const anaLines =
        doc.splitTextToSize(analisis, 180);

    doc.text(anaLines, 14, 232);

    /* =====================================
       FOOTER
    ===================================== */

    doc.setDrawColor(220);
    doc.line(14, 278, 196, 278);

    doc.setFontSize(9);
    doc.setTextColor(100);

    doc.text(
        "MindCare © Reporte generado automáticamente",
        14,
        285
    );

    /* =====================================
       DESCARGA
    ===================================== */

    doc.save("MindCare_Reporte_Pro.pdf");
}

/* =====================================================
   UTILIDAD CAJAS
===================================================== */

function dibujarCaja(
    doc,
    x,
    y,
    w,
    h,
    titulo,
    valor
) {
    doc.setDrawColor(220);
    doc.roundedRect(x, y, w, h, 4, 4);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(titulo, x + 4, y + 8);

    doc.setFontSize(11);
    doc.setTextColor(20);

    const texto =
        doc.splitTextToSize(valor, w - 8);

    doc.text(texto, x + 4, y + 17);
}
/* =====================================================
GRÁFICAS
===================================================== */
function crearGraficas(datos) {

    if (
        typeof Chart ===
        "undefined"
    ) return;

    const c1 =
        document.getElementById(
            "graficaLineas"
        );

    const c2 =
        document.getElementById(
            "graficaCategorias"
        );

    if (!c1 || !c2)
        return;

    if (chartLinea)
        chartLinea.destroy();

    if (chartDona)
        chartDona.destroy();

    const ultimos =
        datos.slice(-7);

    const labels =
        ultimos.map(
            (_, i) =>
                "Registro " +
                (i + 1)
        );

    chartLinea =
        new Chart(c1, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Ánimo",
                        data:
                            ultimos.map(x =>
                                x.nivelAnimo),
                        backgroundColor:
                            "rgba(37,99,235,.8)"
                    },
                    {
                        label: "Estrés",
                        data:
                            ultimos.map(x =>
                                x.nivelEstres),
                        backgroundColor:
                            "rgba(239,68,68,.8)"
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10
                    }
                }
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

    if (
        !datos ||
        datos.length < 2
    ) {

        texto(
            "analisisGrafica",
            "Aún no hay suficientes datos."
        );

        return;
    }

    const ultimos =
        datos.slice(-5);

    const promAnimo =
        promedio(
            ultimos,
            "nivelAnimo"
        );

    const promEstres =
        promedio(
            ultimos,
            "nivelEstres"
        );

    let msg =
        "🙂 Estado estable.";

    if (
        promAnimo <= 4 &&
        promEstres >= 7
    )
        msg =
            "🚨 Riesgo emocional detectado.";

    else if (
        promEstres >= 7
    )
        msg =
            "⚠ Estrés alto reciente.";

    else if (
        promAnimo <= 5
    )
        msg =
            "⚠ Ánimo bajo reciente.";

    texto(
        "analisisGrafica",
        msg
    );
}

/* ===================================================== */
function consejoIA(
    animo,
    estres,
    cat
) {

    if (animo <= 4)
        return "Busca apoyo emocional.";

    if (estres >= 7)
        return "Reduce carga mental.";

    if (cat === "Trabajo")
        return "Organiza tiempos.";

    if (cat === "Familia")
        return "Comunica emociones.";

    return "Mantén hábitos saludables.";
}

/* ===================================================== */
function promedio(
    lista,
    campo
) {

    let total = 0;

    lista.forEach(x =>
        total += Number(
            x[campo]
        )
    );

    return (
        total /
        lista.length
    ).toFixed(1);
}

/* ===================================================== */
function texto(id, val) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText = val;
}

/* ===================================================== */
function inicio() {
    location.href =
        "dashboard.html";
}

function irTest() {
    location.href =
        "test.html";
}

function irRegistro() {
    location.href =
        "registroEmocional.html";
}

function irPsicologos() {
    location.href =
        "psicologos.html";
}

function logout() {
    localStorage.clear();
    location.href =
        "login.html";
}
/* =====================================================
   DASHBOARD PDF PRO - MindCare
   REEMPLAZA TU FUNCIÓN generarPDF()
===================================================== */

async function generarPDF() {

    if (!window.jspdf) {
        alert("No se cargó jsPDF");
        return;
    }

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF("p", "mm", "a4");

    const nombre =
        document.getElementById("bienvenida")?.innerText ||
        "Usuario";

    const promedio =
        document.getElementById("promedioResultado")?.innerText ||
        "Sin datos";

    const ia =
        document.getElementById("iaResultado")?.innerText ||
        "Sin datos";

    const phq9 =
        document.getElementById("phq9Box")?.innerText ||
        "Sin datos";

    const tendencia =
        document.getElementById("phq9Trend")?.innerText ||
        "Sin datos";

    const riesgo =
        document.getElementById("historialPredictivo")?.innerText ||
        "Sin datos";

    const cita =
        document.getElementById("citaBox")?.innerText ||
        "Sin citas";

    const alerta =
        document.getElementById("alertaBox")?.innerText ||
        "Sin alertas";

    const consejo =
        document.getElementById("consejoBox")?.innerText ||
        "Sin consejo";

    const analisis =
        document.getElementById("analisisGrafica")?.innerText ||
        "Sin análisis";

    /* =====================================
       ENCABEZADO
    ===================================== */

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("MindCare", 14, 18);

    doc.setFontSize(10);
    doc.text("Reporte emocional inteligente", 145, 18);

    /* =====================================
       DATOS GENERALES
    ===================================== */

    doc.setTextColor(30, 41, 59);

    doc.setFontSize(16);
    doc.text("Resumen general", 14, 40);

    doc.setFontSize(11);

    doc.text("Usuario:", 14, 50);
    doc.text(nombre, 45, 50);

    doc.text("Fecha:", 14, 58);
    doc.text(new Date().toLocaleString(), 45, 58);

    doc.text("Promedio:", 14, 66);
    doc.text(promedio, 45, 66);

    /* =====================================
       TARJETAS
    ===================================== */

    dibujarCaja(doc, 14, 78, 88, 28, "IA Principal", ia);
    dibujarCaja(doc, 108, 78, 88, 28, "PHQ9", phq9);

    dibujarCaja(doc, 14, 112, 88, 28, "Tendencia", tendencia);
    dibujarCaja(doc, 108, 112, 88, 28, "Riesgo", riesgo);

    dibujarCaja(doc, 14, 146, 88, 28, "Próxima cita", cita);
    dibujarCaja(doc, 108, 146, 88, 28, "Alerta", alerta);

    /* =====================================
       TEXTO IA
    ===================================== */

    doc.setFontSize(15);
    doc.text("Recomendación IA", 14, 188);

    doc.setFontSize(11);

    const consejoLines =
        doc.splitTextToSize(consejo, 180);

    doc.text(consejoLines, 14, 198);

    doc.setFontSize(15);
    doc.text("Interpretación gráfica", 14, 222);

    doc.setFontSize(11);

    const anaLines =
        doc.splitTextToSize(analisis, 180);

    doc.text(anaLines, 14, 232);

    /* =====================================
       FOOTER
    ===================================== */

    doc.setDrawColor(220);
    doc.line(14, 278, 196, 278);

    doc.setFontSize(9);
    doc.setTextColor(100);

    doc.text(
        "MindCare © Reporte generado automáticamente",
        14,
        285
    );

    /* =====================================
       DESCARGA
    ===================================== */

    doc.save("MindCare_Reporte_Pro.pdf");
}

/* =====================================================
   UTILIDAD CAJAS
===================================================== */

function dibujarCaja(
    doc,
    x,
    y,
    w,
    h,
    titulo,
    valor
) {
    doc.setDrawColor(220);
    doc.roundedRect(x, y, w, h, 4, 4);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(titulo, x + 4, y + 8);

    doc.setFontSize(11);
    doc.setTextColor(20);

    const texto =
        doc.splitTextToSize(valor, w - 8);

    doc.text(texto, x + 4, y + 17);
}