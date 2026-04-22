/* ==========================================
MINDCARE DASHBOARD MASTER FINAL 🔥
✅ Gráfica de barras
✅ Interpretación automática
✅ PHQ9
✅ Historial predictivo
✅ Citas
✅ Dashboard completo
========================================== */

const API = "https://localhost/api";
const usuarioId = localStorage.getItem("usuarioId");

let chartLinea = null;
let chartDona = null;

/* ========================================== */
window.addEventListener("load", iniciarDashboard);
window.addEventListener("pageshow", iniciarDashboard);

/* ========================================== */
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

    await cargarTodo();
}

/* ========================================== */
async function cargarTodo() {

    await Promise.all([
        cargarRegistros(),
        cargarPHQ9(),
        cargarHistorial(),
        cargarCita()
    ]);
}

/* ========================================== */
async function cargarRegistros() {

    try {

        const res = await fetch(
            `${API}/RegistrosEmocionales/${usuarioId}?t=${Date.now()}`
        );

        const datos = await res.json();

        if (!datos || datos.length === 0) {

            texto("promedioResultado", "Sin datos");
            texto("ultimoRegistro", "Sin registros");
            texto("iaResultado", "Sin análisis");
            texto("consejoBox", "Registra emociones.");
            texto("analisisGrafica", "Aún no hay datos.");
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

        const promAnimo =
            calcularPromedio(datos, "nivelAnimo");

        const promEstres =
            calcularPromedio(datos, "nivelEstres");

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

        } else if (promEstres >= 7) {

            texto(
                "iaResultado",
                "Estrés elevado frecuente."
            );

        } else if (promAnimo >= 8) {

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
        if (promAnimo <= 3 || promEstres >= 8) {

            texto(
                "alertaBox",
                "🚨 Riesgo emocional alto"
            );

        } else if (promAnimo <= 5 || promEstres >= 6) {

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

/* ========================================== */
async function cargarPHQ9() {

    try {

        const res = await fetch(
            `${API}/TestPHQ9/${usuarioId}?t=${Date.now()}`
        );

        if (!res.ok) {
            texto("phq9Box", "Sin test");
            texto("phq9Trend", "Sin historial");
            return;
        }

        const lista = await res.json();

        if (!lista.length) {
            texto("phq9Box", "Sin test");
            return;
        }

        const actual = lista[0];

        texto(
            "phq9Box",
            `${actual.puntaje} pts | ${actual.nivel}`
        );

        if (lista.length >= 2) {

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

        texto("phq9Box", "Sin test");
    }
}

/* ========================================== */
async function cargarHistorial() {

    try {

        const res = await fetch(
            `${API}/HistorialPredictivo/usuario/${usuarioId}`
        );

        const lista = await res.json();

        if (!lista.length) {
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

/* ========================================== */
async function cargarCita() {

    try {

        const res = await fetch(
            `${API}/Citas/usuario/${usuarioId}`
        );

        const lista = await res.json();

        if (!lista.length) {
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

/* ==========================================
GRÁFICAS
========================================== */
function crearGraficas(datos) {

    if (typeof Chart === "undefined")
        return;

    const c1 =
        document.getElementById("graficaLineas");

    const c2 =
        document.getElementById("graficaCategorias");

    if (!c1 || !c2) return;

    if (chartLinea) chartLinea.destroy();
    if (chartDona) chartDona.destroy();

    const ultimos =
        datos.slice(-7);

    const labels =
        ultimos.map((x, i) =>
            "Registro " + (i + 1)
        );

    const animo =
        ultimos.map(x =>
            Number(x.nivelAnimo)
        );

    const estres =
        ultimos.map(x =>
            Number(x.nivelEstres)
        );

    /* BARRAS */
    chartLinea = new Chart(c1, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Ánimo",
                    data: animo,
                    backgroundColor:
                        "rgba(37,99,235,.8)",
                    borderRadius: 8
                },
                {
                    label: "Estrés",
                    data: estres,
                    backgroundColor:
                        "rgba(239,68,68,.8)",
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            }
        }
    });

    /* DONA */
    const mapa = {};

    datos.forEach(x => {
        mapa[x.categoria] =
            (mapa[x.categoria] || 0) + 1;
    });

    chartDona = new Chart(c2, {
        type: "doughnut",
        data: {
            labels:
                Object.keys(mapa),

            datasets: [{
                data:
                    Object.values(mapa),

                backgroundColor: [
                    "#2563eb",
                    "#ef4444",
                    "#10b981",
                    "#f59e0b",
                    "#8b5cf6",
                    "#06b6d4"
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/* ==========================================
ANÁLISIS AUTOMÁTICO
========================================== */
function analizarGrafica(datos) {

    if (!datos || datos.length < 2) {

        texto(
            "analisisGrafica",
            "Aún no hay suficientes datos."
        );

        return;
    }

    const ultimos =
        datos.slice(-5);

    const promAnimo =
        ultimos.reduce(
            (a, b) =>
                a + Number(b.nivelAnimo), 0
        ) / ultimos.length;

    const promEstres =
        ultimos.reduce(
            (a, b) =>
                a + Number(b.nivelEstres), 0
        ) / ultimos.length;

    let mensaje = "";

    if (
        promAnimo >= 8 &&
        promEstres <= 4
    ) {

        mensaje =
            "✅ Excelente equilibrio emocional.";

    } else if (
        promAnimo <= 4 &&
        promEstres >= 7
    ) {

        mensaje =
            "🚨 Riesgo emocional detectado.";

    } else if (
        promEstres >= 7
    ) {

        mensaje =
            "⚠ Estrés alto reciente.";

    } else if (
        promAnimo <= 5
    ) {

        mensaje =
            "⚠ Ánimo bajo reciente.";

    } else {

        mensaje =
            "🙂 Estado emocional estable.";
    }

    texto(
        "analisisGrafica",
        mensaje
    );
}

/* ========================================== */
function consejoIA(animo, estres, cat) {

    if (animo <= 4)
        return "Busca apoyo emocional.";

    if (estres >= 7)
        return "Reduce carga mental.";

    if (cat === "Trabajo")
        return "Organiza tiempos laborales.";

    if (cat === "Familia")
        return "Comunica emociones.";

    return "Mantén hábitos saludables.";
}

/* ========================================== */
function calcularPromedio(lista, campo) {

    let total = 0;

    lista.forEach(x => {
        total += Number(x[campo]);
    });

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

/* ==========================================
PDF REPORTE
========================================== */
function generarPDF() {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(
        "Reporte MindCare",
        20,
        20
    );

    doc.setFontSize(12);

    doc.text(
        "Usuario: " +
        document.getElementById(
            "bienvenida"
        ).innerText,
        20,
        40
    );

    doc.text(
        "Promedio: " +
        document.getElementById(
            "promedioResultado"
        ).innerText,
        20,
        55
    );

    doc.text(
        "IA: " +
        document.getElementById(
            "iaResultado"
        ).innerText,
        20,
        70
    );

    doc.text(
        "PHQ9: " +
        document.getElementById(
            "phq9Box"
        ).innerText,
        20,
        85
    );

    doc.text(
        "Alerta: " +
        document.getElementById(
            "alertaBox"
        ).innerText,
        20,
        100
    );

    doc.save(
        "reporte_mindcare.pdf"
    );
}

/* ========================================== */
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