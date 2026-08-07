const API = window.MINDCARE_API_BASE;

const psicologoId =
    localStorage.getItem("usuarioId");

let usuarioCita = 0;
let usuarioNota = 0;
let calendar;
let chartRiesgoClinico;
let chartTendenciaClinica;
let chartDimensionesClinicas;

window.onload = async function () {

    if (!localStorage.getItem("token") || !psicologoId) {
        location.href = "../login.html";
        return;
    }

    iniciarCalendario();

    await cargarTodo();
};

async function cargarTodo() {

    await Promise.all([
        cargarResumen(),
        cargarEventos(),
        cargarPacientesAsignados()
    ]);
}

async function cargarResumen() {

    try {

        const res =
            await fetch(`${API}/PsicologoDashboard/resumen`);

        if (!res.ok) throw new Error();

        const data =
            await res.json();

        setNum("totalPacientes", data.totalPacientes || 0);
        setNum("citasHoy", data.citasHoy || 0);
        setNum("riesgoAlto", data.riesgoAlto || 0);
        setNum("pendientes", data.pendientes || 0);

    } catch {

        toast("No se pudo cargar resumen", "error");
    }
}

async function cargarPacientesAsignados() {

    const tabla =
        document.getElementById("tablaPacientesAsignados");

    try {

        const res =
            await fetch(`${API}/PsicologoDashboard/pacientes`);

        if (!res.ok) throw new Error();

        const lista =
            await res.json();

        const iaRes =
            await fetch(`${API}/IA/psicologo/pacientes?t=${Date.now()}`);

        const iaLista =
            iaRes.ok
                ? await iaRes.json()
                : [];

        const iaPorPaciente =
            new Map(
                iaLista.map(x => [
                    Number(x.pacienteId),
                    x.analisis
                ])
            );

        if (!lista.length) {
            renderColaClinica([]);
            renderWorkbenchClinico([]);
            renderAnaliticaClinica([]);

            tabla.innerHTML = `
<tr>
<td colspan="6">
Sin pacientes asignados todavía.
</td>
</tr>`;
            return;
        }

        const ordenados =
            lista
            .map(p => ({
                ...p,
                ia:
                    iaPorPaciente.get(Number(p.id)) || {}
            }))
            .sort((a, b) =>
                Number(b.ia?.score || 0) -
                Number(a.ia?.score || 0)
            );

        renderColaClinica(ordenados);
        renderWorkbenchClinico(ordenados);
        renderAnaliticaClinica(ordenados);

        tabla.innerHTML = ordenados.map(p => {

            const ia =
                p.ia || {};

            return `
<tr>
<td>
<strong>${escapeHtml(p.nombre)}</strong><br>
<small>${escapeHtml(p.zona || "-")}</small>
</td>
<td>
Ánimo: ${valor(p.ultimoAnimo)}/10<br>
Estrés: ${valor(p.ultimoEstres)}/10<br>
<span class="muted">${formatoFecha(p.ultimoRegistroFecha)}</span>
</td>
<td>
PHQ-9: ${valor(p.phq9)}<br>
Test de estrés: ${valor(p.estresLaboral)}
</td>
<td>
<span class="${claseRiesgo(ia.nivel || p.riesgo)}">
${escapeHtml(ia.nivel || p.riesgo || "Sin datos")}
</span>
<div class="ia-score-row">
<b>${Number(ia.score || 0)}</b>
<span>Score IA</span>
</div>
<small>${escapeHtml(ia.semaforo?.accion || ia.prioridad || "-")}</small>
</td>
<td>
${formatoFecha(p.proximaCita)}
</td>
<td>
<div class="action-row">
<button onclick="verHistorial(${p.id})">Expediente</button>
<button onclick="generarPDFPaciente(${p.id})">PDF</button>
<button onclick="agendarCita(${p.id})">Cita</button>
<button onclick="abrirNota(${p.id})">Nota</button>
</div>
</td>
</tr>
`;
        }).join("");

    } catch {

        renderWorkbenchClinico([]);
        renderAnaliticaClinica([]);

        tabla.innerHTML = `
<tr>
<td colspan="6">
Error cargando pacientes asignados.
</td>
</tr>`;
    }
}

function renderAnaliticaClinica(pacientes) {

    if (!document.getElementById("graficaRiesgoClinico"))
        return;

    configurarChartClinico();

    if (!pacientes.length) {
        destruirGraficasClinicas();
        renderFallbackClinico(
            {
                critico: 0,
                alto: 0,
                medio: 0,
                bajo: 0,
                sinDatos: 0
            },
            {
                mejora: 0,
                estable: 0,
                deterioro: 0,
                insuficiente: 0
            },
            {
                depresion: 0,
                estresLaboral: 0,
                estresDiario: 0,
                animoBajo: 0,
                deterioro: 0,
                adherencia: 0
            }
        );
        document
            .querySelector(".clinical-analytics")
            ?.classList.add("chart-offline");
        setText("analiticaConfianza", "0%");
        setText("analiticaCriticos", "0");
        setText("analiticaSinDatos", "0");
        setText("analiticaAccion", "Asignar pacientes");
        setText("analiticaRiesgoTexto", "Asigna pacientes para construir el mapa clínico.");
        setText("analiticaTendenciaTexto", "Sin registros recientes para analizar tendencia.");
        return;
    }

    const resumenRiesgo =
        contarRiesgo(pacientes);

    const resumenTendencia =
        contarTendencia(pacientes);

    const dimensiones =
        promediarDimensiones(pacientes);

    const confianzaPromedio =
        promedio(
            pacientes.map(p => Number(p.ia?.confianza || 0))
        );

    const altaPrioridad =
        resumenRiesgo.critico + resumenRiesgo.alto;

    const sinDatos =
        resumenRiesgo.sinDatos;

    setText("analiticaConfianza", `${confianzaPromedio}%`);
    setText("analiticaCriticos", altaPrioridad);
    setText("analiticaSinDatos", sinDatos);
    setText("analiticaAccion", accionGrupal(altaPrioridad, resumenRiesgo.medio, sinDatos));
    setText(
        "analiticaRiesgoTexto",
        textoRiesgoClinico(resumenRiesgo, pacientes.length)
    );
    setText(
        "analiticaTendenciaTexto",
        textoTendenciaClinica(resumenTendencia)
    );

    renderFallbackClinico(
        resumenRiesgo,
        resumenTendencia,
        dimensiones
    );

    if (typeof Chart === "undefined")
    {
        document
            .querySelector(".clinical-analytics")
            ?.classList.add("chart-offline");
        return;
    }

    document
        .querySelector(".clinical-analytics")
        ?.classList.remove("chart-offline");

    renderGraficaRiesgoClinico(resumenRiesgo);
    renderGraficaTendenciaClinica(resumenTendencia);
    renderGraficaDimensionesClinicas(dimensiones);
}

function renderFallbackClinico(
    resumenRiesgo,
    resumenTendencia,
    dimensiones) {

    const totalRiesgo =
        Math.max(
            1,
            resumenRiesgo.critico +
            resumenRiesgo.alto +
            resumenRiesgo.medio +
            resumenRiesgo.bajo +
            resumenRiesgo.sinDatos
        );

    setHtml(
        "fallbackRiesgoClinico",
        [
            filaFallback("Crítico", resumenRiesgo.critico, totalRiesgo, "critical"),
            filaFallback("Alto", resumenRiesgo.alto, totalRiesgo, "high"),
            filaFallback("Medio", resumenRiesgo.medio, totalRiesgo, "medium"),
            filaFallback("Bajo", resumenRiesgo.bajo, totalRiesgo, "low"),
            filaFallback("Sin datos", resumenRiesgo.sinDatos, totalRiesgo, "neutral")
        ].join("")
    );

    const totalTendencia =
        Math.max(
            1,
            resumenTendencia.mejora +
            resumenTendencia.estable +
            resumenTendencia.deterioro +
            resumenTendencia.insuficiente
        );

    setHtml(
        "fallbackTendenciaClinica",
        [
            filaFallback("Mejora", resumenTendencia.mejora, totalTendencia, "low"),
            filaFallback("Estable", resumenTendencia.estable, totalTendencia, ""),
            filaFallback("Deterioro", resumenTendencia.deterioro, totalTendencia, "high"),
            filaFallback("Insuficiente", resumenTendencia.insuficiente, totalTendencia, "neutral")
        ].join("")
    );

    setHtml(
        "fallbackDimensionesClinicas",
        [
            filaFallback("Depresión", dimensiones.depresion, 100, "high"),
            filaFallback("Test de estrés", dimensiones.estresLaboral, 100, "medium"),
            filaFallback("Estrés diario", dimensiones.estresDiario, 100, "medium"),
            filaFallback("Ánimo bajo", dimensiones.animoBajo, 100, "high"),
            filaFallback("Deterioro", dimensiones.deterioro, 100, "high"),
            filaFallback("Adherencia", dimensiones.adherencia, 100, "low")
        ].join("")
    );
}

function filaFallback(etiqueta, valor, total, clase) {

    const numero =
        Number(valor || 0);

    const porcentaje =
        Math.max(
            numero > 0 ? 4 : 0,
            Math.min(100, Math.round((numero / total) * 100))
        );

    return `
        <div class="fallback-row">
            <header>
                <span>${escapeHtml(etiqueta)}</span>
                <b>${numero}</b>
            </header>
            <div class="fallback-track">
                <div class="fallback-bar ${clase}"
                     style="width:${porcentaje}%"></div>
            </div>
        </div>`;
}

function renderGraficaRiesgoClinico(resumen) {

    const canvas =
        document.getElementById("graficaRiesgoClinico");

    if (!canvas)
        return;

    if (chartRiesgoClinico)
        chartRiesgoClinico.destroy();

    chartRiesgoClinico =
        new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: [
                    "Crítico",
                    "Alto",
                    "Medio",
                    "Bajo",
                    "Sin datos"
                ],
                datasets: [{
                    data: [
                        resumen.critico,
                        resumen.alto,
                        resumen.medio,
                        resumen.bajo,
                        resumen.sinDatos
                    ],
                    backgroundColor: [
                        "#b91c1c",
                        "#ef4444",
                        "#f59e0b",
                        "#10b981",
                        "#94a3b8"
                    ],
                    borderColor: "#ffffff",
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
}

function renderGraficaTendenciaClinica(resumen) {

    const canvas =
        document.getElementById("graficaTendenciaClinica");

    if (!canvas)
        return;

    if (chartTendenciaClinica)
        chartTendenciaClinica.destroy();

    chartTendenciaClinica =
        new Chart(canvas, {
            type: "bar",
            data: {
                labels: [
                    "Mejora",
                    "Estable",
                    "Deterioro",
                    "Insuficiente"
                ],
                datasets: [{
                    label: "Pacientes",
                    data: [
                        resumen.mejora,
                        resumen.estable,
                        resumen.deterioro,
                        resumen.insuficiente
                    ],
                    backgroundColor: [
                        "#10b981",
                        "#2f6fed",
                        "#ef4444",
                        "#94a3b8"
                    ],
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
}

function renderGraficaDimensionesClinicas(dimensiones) {

    const canvas =
        document.getElementById("graficaDimensionesClinicas");

    if (!canvas)
        return;

    if (chartDimensionesClinicas)
        chartDimensionesClinicas.destroy();

    chartDimensionesClinicas =
        new Chart(canvas, {
            type: "bar",
            data: {
                labels: [
                    "Depresión",
                    "Test de estrés",
                    "Estrés diario",
                    "Ánimo bajo",
                    "Deterioro",
                    "Adherencia"
                ],
                datasets: [{
                    label: "Promedio clínico",
                    data: [
                        dimensiones.depresion,
                        dimensiones.estresLaboral,
                        dimensiones.estresDiario,
                        dimensiones.animoBajo,
                        dimensiones.deterioro,
                        dimensiones.adherencia
                    ],
                    backgroundColor: "rgba(47, 111, 237, 0.18)",
                    borderColor: "#2f6fed",
                    borderWidth: 2,
                    borderRadius: 10,
                    barThickness: 22
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: value => `${value}%`
                        },
                        grid: {
                            color: "#d9e4f2"
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
}

function contarRiesgo(pacientes) {

    const resumen = {
        critico: 0,
        alto: 0,
        medio: 0,
        bajo: 0,
        sinDatos: 0
    };

    pacientes.forEach(p => {
        const nivel =
            normalizarTexto(p.ia?.nivel || p.riesgo || "");

        if (!nivel || nivel.includes("sin datos")) {
            resumen.sinDatos++;
        }
        else if (nivel.includes("critico")) {
            resumen.critico++;
        }
        else if (nivel.includes("alto")) {
            resumen.alto++;
        }
        else if (nivel.includes("medio") || nivel.includes("moderado")) {
            resumen.medio++;
        }
        else {
            resumen.bajo++;
        }
    });

    return resumen;
}

function contarTendencia(pacientes) {

    const resumen = {
        mejora: 0,
        estable: 0,
        deterioro: 0,
        insuficiente: 0
    };

    pacientes.forEach(p => {
        const tendencia =
            normalizarTexto(p.ia?.tendencia || "");

        if (tendencia.includes("mejora")) {
            resumen.mejora++;
        }
        else if (tendencia.includes("deterioro")) {
            resumen.deterioro++;
        }
        else if (tendencia.includes("estable")) {
            resumen.estable++;
        }
        else {
            resumen.insuficiente++;
        }
    });

    return resumen;
}

function promediarDimensiones(pacientes) {

    const llaves = [
        "depresion",
        "estresLaboral",
        "estresDiario",
        "animoBajo",
        "deterioro",
        "adherencia"
    ];

    const resultado = {};

    llaves.forEach(llave => {
        resultado[llave] =
            promedio(
                pacientes.map(p =>
                    Number(p.ia?.dimensiones?.[llave] || 0)
                )
            );
    });

    return resultado;
}

function textoRiesgoClinico(resumen, total) {

    const prioridad =
        resumen.critico + resumen.alto;

    if (prioridad > 0) {
        return `${prioridad} de ${total} pacientes requieren revisión prioritaria.`;
    }

    if (resumen.medio > 0) {
        return `${resumen.medio} pacientes requieren seguimiento cercano esta semana.`;
    }

    if (resumen.sinDatos === total) {
        return "La cohorte requiere registros y evaluaciones iniciales.";
    }

    return "La cohorte se mantiene en monitoreo preventivo.";
}

function textoTendenciaClinica(resumen) {

    if (resumen.deterioro > 0) {
        return `${resumen.deterioro} pacientes muestran deterioro reciente.`;
    }

    if (resumen.mejora > 0) {
        return `${resumen.mejora} pacientes muestran mejora emocional.`;
    }

    if (resumen.estable > 0) {
        return "Predomina una tendencia estable en la cohorte.";
    }

    return "Se necesitan más registros para calcular tendencia.";
}

function accionGrupal(altaPrioridad, medio, sinDatos) {

    if (altaPrioridad > 0)
        return "Priorizar contacto";

    if (medio > 0)
        return "Seguimiento semanal";

    if (sinDatos > 0)
        return "Completar datos";

    return "Monitorear";
}

function promedio(valores) {

    const validos =
        valores.filter(v => Number.isFinite(v));

    if (!validos.length)
        return 0;

    return Math.round(
        validos.reduce((total, actual) => total + actual, 0) /
        validos.length
    );
}

function destruirGraficasClinicas() {

    [
        chartRiesgoClinico,
        chartTendenciaClinica,
        chartDimensionesClinicas
    ].forEach(chart => {
        if (chart)
            chart.destroy();
    });

    chartRiesgoClinico = null;
    chartTendenciaClinica = null;
    chartDimensionesClinicas = null;
}

function configurarChartClinico() {

    if (typeof Chart === "undefined")
        return;

    Chart.defaults.font.family = "'Segoe UI', sans-serif";
    Chart.defaults.color = "#60708a";
    Chart.defaults.plugins.tooltip.backgroundColor = "#172033";
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
}

function renderWorkbenchClinico(pacientes) {

    const contenedor =
        document.getElementById("pacientesPrioritarios");

    if (!contenedor)
        return;

    if (!pacientes.length) {
        contenedor.innerHTML = `
            <div class="empty-state">
                Asigna pacientes para activar la priorización clínica.
            </div>`;

        setText("promedioIAClinica", "0");
        setText("seguimientoCercano", "0");
        setText("sinDatosClinicos", "0");
        setText("actualizacionClinica", "Sin pacientes asignados");
        return;
    }

    const scores =
        pacientes.map(p => Number(p.ia?.score || 0));

    const promedio =
        Math.round(
            scores.reduce((total, actual) => total + actual, 0) /
            scores.length
        );

    const seguimiento =
        pacientes.filter(p => {
            const nivel =
                String(p.ia?.nivel || "").toLowerCase();

            return (
                Number(p.ia?.score || 0) >= 35 ||
                nivel.includes("medio") ||
                nivel.includes("alto") ||
                nivel.includes("critico") ||
                nivel.includes("crítico")
            );
        }).length;

    const sinDatos =
        pacientes.filter(p =>
            Number(p.ia?.score || 0) === 0 ||
            String(p.ia?.nivel || "").toLowerCase().includes("sin datos")
        ).length;

    setText("promedioIAClinica", promedio);
    setText("seguimientoCercano", seguimiento);
    setText("sinDatosClinicos", sinDatos);
    setText(
        "actualizacionClinica",
        `Actualizado ${new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit"
        })}`
    );

    contenedor.innerHTML =
        pacientes.slice(0, 4).map(p => tarjetaPacientePrioritario(p)).join("");
}

function tarjetaPacientePrioritario(paciente) {

    const ia =
        paciente.ia || {};

    const score =
        Number(ia.score || 0);

    const nivel =
        ia.nivel || paciente.riesgo || "Sin datos";

    const recomendacion =
        ia.accionPrioritaria?.detalle ||
        ia.semaforo?.accion ||
        ia.prioridad ||
        "Revisar expediente clínico";

    return `
        <article class="priority-card">
            <div class="priority-top">
                <div>
                    <span class="${claseRiesgo(nivel)}">${escapeHtml(nivel)}</span>
                    <h3>${escapeHtml(paciente.nombre || "Paciente")}</h3>
                    <p>${escapeHtml(paciente.zona || "Sin zona registrada")}</p>
                </div>
                <div class="mini-score ${claseScore(score)}">
                    <strong>${score}</strong>
                    <span>IA</span>
                </div>
            </div>

            <div class="patient-vitals">
                <div>
                    <span>Ánimo</span>
                    <strong>${valor(paciente.ultimoAnimo)}/10</strong>
                </div>
                <div>
                    <span>Estrés</span>
                    <strong>${valor(paciente.ultimoEstres)}/10</strong>
                </div>
                <div>
                    <span>PHQ-9</span>
                    <strong>${valor(paciente.phq9)}</strong>
                </div>
                <div>
                    <span>Laboral</span>
                    <strong>${valor(paciente.estresLaboral)}</strong>
                </div>
            </div>

            <div class="patient-ai-evidence">
                <div>
                    <span>Calidad señal</span>
                    <strong>${escapeHtml(ia.calidadDatos?.nivel || "-")}</strong>
                </div>
                <div>
                    <span>Volatilidad</span>
                    <strong>${escapeHtml(ia.volatilidad?.nivel || "-")}</strong>
                </div>
                <div>
                    <span>Banderas</span>
                    <strong>${Array.isArray(ia.banderasClinicas) ? ia.banderasClinicas.length : 0}</strong>
                </div>
                <div>
                    <span>Perfil IA</span>
                    <strong>${escapeHtml(ia.perfilClinico?.tipo || "-")}</strong>
                </div>
                <div>
                    <span>Trayectoria</span>
                    <strong>${escapeHtml(ia.trayectoriaRiesgo?.estado || "-")}</strong>
                </div>
                <div>
                    <span>Decisión</span>
                    <strong>${escapeHtml(ia.decisionClinica?.nivelDecision || "-")}</strong>
                </div>
                <div>
                    <span>Intervención</span>
                    <strong>${escapeHtml(ia.matrizIntervencion?.nivel || "-")}</strong>
                </div>
            </div>

            <p class="priority-action">${escapeHtml(recomendacion)}</p>

            <div class="priority-meta">
                <span>Último registro: ${formatoFechaCompacta(paciente.ultimoRegistroFecha)}</span>
                <span>Cita: ${formatoFechaCompacta(paciente.proximaCita)}</span>
            </div>

            <div class="priority-actions">
                <button onclick="verHistorial(${paciente.id})">
                    <i class="fa-solid fa-folder-open"></i>
                    Expediente
                </button>
                <button onclick="abrirNota(${paciente.id})">
                    <i class="fa-solid fa-pen-to-square"></i>
                    Nota
                </button>
                <button onclick="agendarCita(${paciente.id})">
                    <i class="fa-solid fa-calendar-plus"></i>
                    Cita
                </button>
            </div>
        </article>`;
}

function renderColaClinica(pacientes) {

    const prioritario =
        pacientes[0];

    if (!prioritario) {
        setText("pacientePrioritario", "Sin paciente prioritario");
        setText("accionPrioritaria", "Asigna pacientes para activar la cola clínica IA.");
        setText("scorePrioritario", "0");
        setText("conteoAlto", "0");
        setText("conteoMedio", "0");
        setText("conteoBajo", "0");
        return;
    }

    setText("pacientePrioritario", prioritario.nombre || "Paciente");
    setText(
        "accionPrioritaria",
        prioritario.ia?.semaforo?.accion ||
        prioritario.ia?.prioridad ||
        "Revisar expediente clínico"
    );
    setText("scorePrioritario", Number(prioritario.ia?.score || 0));

    let alto = 0;
    let medio = 0;
    let bajo = 0;

    pacientes.forEach(p => {
        const nivel =
            String(p.ia?.nivel || "").toLowerCase();

        if (
            nivel.includes("critico") ||
            nivel.includes("crítico") ||
            nivel.includes("alto")
        ) {
            alto++;
        }
        else if (nivel.includes("medio")) {
            medio++;
        }
        else {
            bajo++;
        }
    });

    setText("conteoAlto", alto);
    setText("conteoMedio", medio);
    setText("conteoBajo", bajo);
}

async function buscarUsuario() {

    const input = document.getElementById("buscar");
    const correo = input.value.trim();

    if (!correo) {
        toast("Ingresa el correo del paciente", "error");
        input.focus();
        return;
    }

    try {

        const res =
            await fetch(
                `${API}/Usuarios/buscar?correo=${encodeURIComponent(correo)}`
            );

        if (res.status === 404) {
            throw new Error(
                "No se encontró una cuenta de paciente con ese correo."
            );
        }

        if (res.status === 403) {
            throw new Error(
                "Tu cuenta profesional requiere verificación administrativa antes de consultar pacientes."
            );
        }

        if (res.status === 401) {
            throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
        }

        if (!res.ok)
            throw new Error(await res.text());

        const data =
            await res.json();

        tablaUsuarios.innerHTML = `
<tr>
<td>
<strong>${escapeHtml(data.nombre)}</strong><br>
<small>${escapeHtml(data.email)}</small>
</td>
<td>
<button onclick="asignarPaciente(${data.id})">Asignar</button>
<button onclick="verHistorial(${data.id})">Historial</button>
<button onclick="agendarCita(${data.id})">Agendar</button>
</td>
</tr>`;

    } catch (error) {

        tablaUsuarios.innerHTML = `
<tr>
<td colspan="2">
${escapeHtml(limpiarMensaje(error.message) || "No fue posible consultar el paciente.")}
</td>
</tr>`;

        toast(
            limpiarMensaje(error.message) ||
            "No se pudo buscar al paciente",
            "error"
        );
    }
}

async function asignarPaciente(id) {

    try {

        const res =
            await fetch(
                `${API}/PsicologoDashboard/pacientes/${id}/asignar`,
                { method: "POST" }
            );

        if (!res.ok) {
            if (res.status === 403) {
                throw new Error(
                    "Tu cuenta profesional requiere verificación administrativa antes de asignar pacientes."
                );
            }

            throw new Error(await res.text());
        }

        toast("Paciente asignado");
        await cargarTodo();

    } catch (error) {

        toast(
            limpiarMensaje(error.message) ||
            "No se pudo asignar paciente",
            "error"
        );
    }
}

function iniciarCalendario() {

    calendar =
        new FullCalendar.Calendar(
            document.getElementById("calendar"),
            {
                initialView: "dayGridMonth",
                locale: "es",
                height: "auto",
                headerToolbar: {
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek"
                }
            }
        );

    calendar.render();
}

async function cargarEventos() {

    try {

        const res =
            await fetch(`${API}/Citas/psicologo/${psicologoId}`);

        if (!res.ok) throw new Error();

        const lista =
            await res.json();

        calendar.removeAllEvents();

        lista.forEach(x => {
            calendar.addEvent({
                title: x.nombrePaciente || "Paciente",
                start: x.fecha
            });
        });

    } catch {

        toast("No se pudo cargar agenda", "error");
    }
}

function verHistorial(id) {

    window.open(
        `../historialusuario.html?id=${id}`,
        "_blank"
    );
}

function generarPDFPaciente(id) {

    window.open(
        `../historialusuario.html?id=${id}&autopdf=1`,
        "_blank"
    );
}

function agendarCita(id) {

    usuarioCita = id;
    modalCita.style.display = "flex";
}

function cerrarModal() {

    modalCita.style.display = "none";
}

async function guardarCita() {

    const fecha = fechaCita.value;
    const nota = notaCita.value;

    if (!fecha) {
        toast("Selecciona fecha", "error");
        return;
    }

    try {

        const res =
            await fetch(
                `${API}/Citas`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        usuarioId: usuarioCita,
                        psicologoId: parseInt(psicologoId),
                        fecha,
                        estado: "Pendiente",
                        observacion: nota
                    })
                }
            );

        if (!res.ok) {
            if (res.status === 403) {
                throw new Error(
                    "Tu cuenta profesional requiere verificación administrativa antes de programar citas."
                );
            }

            throw new Error(await res.text());
        }

        cerrarModal();
        fechaCita.value = "";
        notaCita.value = "";

        await cargarTodo();
        toast("Cita creada");

    } catch (error) {

        toast(
            limpiarMensaje(error.message) ||
            "No se pudo crear cita",
            "error"
        );
    }
}

function abrirNota(id) {

    usuarioNota = id;
    notaSeguimiento.value = "";
    planAccion.value = "";
    modalNota.style.display = "flex";
}

function cerrarNota() {

    modalNota.style.display = "none";
}

async function guardarNota() {

    const nota =
        notaSeguimiento.value.trim();

    const plan =
        planAccion.value.trim();

    if (!nota) {
        toast("Escribe una nota", "error");
        return;
    }

    try {

        const res =
            await fetch(
                `${API}/PsicologoDashboard/pacientes/${usuarioNota}/notas`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        nota,
                        planAccion: plan
                    })
                }
            );

        if (!res.ok)
            throw new Error(await res.text());

        cerrarNota();
        await cargarPacientesAsignados();
        toast("Nota guardada");

    } catch (error) {

        toast(
            limpiarMensaje(error.message) ||
            "No se pudo guardar nota",
            "error"
        );
    }
}

function logout() {

    localStorage.clear();
    location.href = "../login.html";
}

function setNum(id, v) {

    const el = document.getElementById(id);

    if (el)
        el.innerText = v;
}

function setText(id, value) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText = value;
}

function setHtml(id, value) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerHTML = value;
}

function valor(v) {
    return v === null || v === undefined ? "-" : v;
}

function formatoFecha(fecha) {

    if (!fecha) return "-";

    return new Date(fecha).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function formatoFechaCompacta(fecha) {

    if (!fecha) return "-";

    return new Date(fecha).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short"
    });
}

function claseScore(score) {

    if (score >= 70)
        return "high";

    if (score >= 35)
        return "medium";

    return "low";
}

function claseRiesgo(riesgo) {

    const texto =
        (riesgo || "").toLowerCase();

    if (
        texto.includes("alto") ||
        texto.includes("severo") ||
        texto.includes("crítico") ||
        texto.includes("grave")
    ) {
        return "risk-chip high";
    }

    if (
        texto.includes("medio") ||
        texto.includes("moderado") ||
        texto.includes("alarma")
    ) {
        return "risk-chip medium";
    }

    return "risk-chip";
}

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function limpiarMensaje(txt) {

    return String(txt || "")
        .replaceAll('"', "")
        .replaceAll("{", "")
        .replaceAll("}", "")
        .trim();
}

function normalizarTexto(txt) {

    return String(txt || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function toast(msg, tipo = "ok") {

    const t = document.getElementById("toast");

    if (!t) return;

    t.className = "";
    t.innerText = msg;

    if (tipo === "error")
        t.classList.add("error");

    t.classList.add("show");

    setTimeout(() => {
        t.className = "";
    }, 3000);
}
