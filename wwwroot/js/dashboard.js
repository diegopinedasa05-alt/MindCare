/* =====================================================
   MINDCARE DASHBOARD MASTER FINAL PRO
   SOLO SE AGREGÓ:
   ✅ cargarInfoTests()
   ✅ pintarPHQ()
   ✅ pintarEstres()
   ✅ Vista explicativa en dashboard
===================================================== */

const API = window.MINDCARE_API_BASE;

const usuarioId =
    localStorage.getItem("usuarioId");

let chartLinea = null;
let chartDona = null;
let chartTests = null;
let chartRadar = null;

const estadoDashboard = {
    registros: [],
    phq: 0,
    estres: 0,
    cita: null,
    ia: null,
    seguimiento: {
        historial: [],
        hoy: null,
        preguntas: [],
        tareas: [],
        completadas: [false, false, false],
        respuestas: ["", "", ""],
        cargado: false,
        guardando: false,
        sucio: false
    }
};

/* ===================================================== */
window.addEventListener("load", iniciarDashboard);
window.addEventListener("pageshow", iniciarDashboard);

document.addEventListener("DOMContentLoaded", configurarMenuMovil);

function configurarMenuMovil() {

    const sidebar = document.querySelector(".user-dashboard .sidebar");
    const toggle = document.querySelector(".mobile-menu-toggle");
    const menu = document.querySelector(".user-dashboard .menu");

    if (!sidebar || !toggle || !menu) {
        return;
    }

    const cerrarMenu = () => {
        sidebar.classList.remove("is-menu-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menú de navegación");
        toggle.innerHTML = '<i class="fa-solid fa-bars"></i><span>Menú</span>';
    };

    toggle.addEventListener("click", () => {
        const abierto = sidebar.classList.toggle("is-menu-open");
        toggle.setAttribute("aria-expanded", String(abierto));
        toggle.setAttribute(
            "aria-label",
            abierto ? "Cerrar menú de navegación" : "Abrir menú de navegación"
        );
        toggle.innerHTML = abierto
            ? '<i class="fa-solid fa-xmark"></i><span>Cerrar</span>'
            : '<i class="fa-solid fa-bars"></i><span>Menú</span>';
    });

    menu.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => {
            if (window.matchMedia("(max-width: 640px)").matches) {
                cerrarMenu();
            }
        });
    });

    window.addEventListener("resize", () => {
        if (!window.matchMedia("(max-width: 640px)").matches) {
            cerrarMenu();
        }
    });
}

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
        cargarCita(),
        cargarInfoTests(),
        cargarSeguimientoWeb()
    ]);

    await cargarIA();
}

/* =====================================================
SEGUIMIENTO WEB
Comparte el mismo contrato de seguimiento que Flutter.
===================================================== */
async function cargarSeguimientoWeb() {

    const seguimiento = estadoDashboard.seguimiento;

    try {
        const [historialRes, hoyRes] = await Promise.all([
            fetch(`${API}/Seguimiento/usuario/${usuarioId}?t=${Date.now()}`),
            fetch(`${API}/Seguimiento/usuario/${usuarioId}/hoy?t=${Date.now()}`)
        ]);

        const historial = historialRes.ok
            ? await historialRes.json()
            : [];

        const hoy = hoyRes.ok
            ? await hoyRes.json()
            : { existe: false };

        seguimiento.historial = Array.isArray(historial)
            ? historial
            : [];

        if (hoy?.existe) {
            aplicarSeguimientoGuardado(hoy);
        } else {
            cargarSeguimientoLocal();
        }
    } catch {
        cargarSeguimientoLocal();
    } finally {
        seguimiento.cargado = true;
    }
}

function aplicarSeguimientoGuardado(datos) {

    const seguimiento = estadoDashboard.seguimiento;
    const completadas = Math.max(
        0,
        Math.min(3, Number(datos.tareasCompletadas || 0))
    );

    seguimiento.hoy = datos;
    seguimiento.completadas = [0, 1, 2].map(i => i < completadas);
    seguimiento.respuestas = [
        String(datos.respuesta1 || ""),
        String(datos.respuesta2 || ""),
        String(datos.respuesta3 || "")
    ];
    seguimiento.sucio = false;
}

function claveSeguimientoLocal() {
    return `mindcare_followup_${usuarioId}_${new Date().toISOString().slice(0, 10)}`;
}

function cargarSeguimientoLocal() {

    try {
        const raw = localStorage.getItem(claveSeguimientoLocal());
        if (!raw)
            return;

        const datos = JSON.parse(raw);
        const seguimiento = estadoDashboard.seguimiento;

        seguimiento.completadas = Array.isArray(datos.completadas)
            ? [0, 1, 2].map(i => Boolean(datos.completadas[i]))
            : seguimiento.completadas;

        seguimiento.respuestas = Array.isArray(datos.respuestas)
            ? [0, 1, 2].map(i => String(datos.respuestas[i] || ""))
            : seguimiento.respuestas;
    } catch {
        // El guardado local es un respaldo opcional.
    }
}

function guardarSeguimientoLocal() {

    const seguimiento = estadoDashboard.seguimiento;

    localStorage.setItem(
        claveSeguimientoLocal(),
        JSON.stringify({
            completadas: seguimiento.completadas,
            respuestas: seguimiento.respuestas
        })
    );
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

            estadoDashboard.registros = [];
            texto("promedioResultado", "Sin datos");
            texto("ultimoRegistro", "Sin registros");
            texto("iaResultado", "Sin análisis");
            texto("consejoBox", "Registra emociones.");
            texto("alertaBox", "Sin alertas");
            renderResumenGraficasSinDatos();
            renderRutaCuidado();
            return;
        }

        datos.sort((a, b) =>
            new Date(a.fecha) -
            new Date(b.fecha)
        );

        const ultimo =
            datos[datos.length - 1];

        estadoDashboard.registros = datos;

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
        renderRutaCuidado();

    } catch {

        texto("iaResultado", "Error");
        renderRutaCuidado();

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

        estadoDashboard.phq = phq;
        estadoDashboard.estres = estres;

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
        renderRutaCuidado();

    } catch {

        texto("phq9Box", "Sin test");
        renderRutaCuidado();

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

/* =====================================================
IA CENTRALIZADA
===================================================== */
async function cargarIA() {

    try {

        const res =
            await fetch(
                `${API}/IA/${usuarioId}?t=${Date.now()}`
            );

        if (!res.ok)
            throw new Error();

        const ia =
            await res.json();

        estadoDashboard.ia = ia;

        texto(
            "iaResultado",
            ia.mensaje || "Análisis no disponible"
        );

        texto(
            "alertaBox",
            `Nivel ${ia.nivel || "Sin datos"}`
        );

        texto(
            "historialPredictivo",
            `Tendencia: ${ia.tendencia || "Sin datos"}`
        );

        const recomendaciones =
            Array.isArray(ia.recomendaciones)
                ? ia.recomendaciones
                : [];

        texto(
            "consejoBox",
            recomendaciones[0] ||
            "Continúa registrando tu estado emocional."
        );

        renderIAAvanzada(ia);

    } catch {

        await cargarHistorial();
        renderRutaCuidado();
    }
}

function renderIAAvanzada(ia) {

    texto("iaScore", ia.score ?? 0);
    texto("iaConfianza", `${ia.confianza ?? 0}%`);
    texto("iaPrioridad", ia.prioridad || "-");
    texto("iaModelo", ia.modelo || "-");
    texto(
        "iaMetodo",
        ia.metodologia ||
        "Motor local basado en reglas ponderadas."
    );

    const chip =
        document.getElementById("iaNivelChip");

    if (chip) {
        chip.className =
            `ia-chip ${String(ia.nivel || "").toLowerCase()}`;
        chip.innerText =
            ia.semaforo?.etiqueta ||
            ia.nivel ||
            "Sin datos";
    }

    texto(
        "iaSemaforo",
        ia.semaforo?.accion ||
        ia.mensaje ||
        "Sin datos suficientes."
    );

    const bar =
        document.getElementById("iaMeterBar");

    if (bar) {
        const score =
            Math.max(0, Math.min(100, Number(ia.score || 0)));

        bar.style.width = `${score}%`;
        bar.className =
            String(ia.nivel || "").toLowerCase();
    }

        renderListaFactores(ia.factores || []);
        renderListaRecomendaciones(ia.recomendaciones || []);
        actualizarRadarIA(ia.dimensiones || {});
        renderPlanPersonal(ia);
        renderAuditoriaIA(ia);
        renderCabinaIA(ia);
}

function renderCabinaIA(ia) {

    const decision =
        ia.decisionClinica || {};

    const bienestar =
        ia.indiceBienestar || {};

    const perfil =
        ia.perfilClinico || {};

    const trayectoria =
        ia.trayectoriaRiesgo || {};

    const accion =
        ia.accionPrioritaria || {};

    const matriz =
        ia.matrizIntervencion || {};

    texto("iaDecisionTitulo", decision.nivelDecision || "Análisis orientativo");
    texto(
        "iaDecisionResumen",
        decision.resumen ||
        decision.razon ||
        "La IA prioriza señales para apoyar el seguimiento."
    );

    texto("iaBienestarScore", bienestar.puntaje ?? 0);
    texto("iaBienestarNivel", bienestar.nivel || "Sin datos");

    const ring =
        document.querySelector(".wellbeing-ring");

    if (ring) {
        const valor =
            Math.max(0, Math.min(100, Number(bienestar.puntaje || 0)));

        ring.style.setProperty("--wellbeing", `${valor}%`);
        ring.dataset.level =
            normalizarTexto(bienestar.nivel || "sin datos");
    }

    texto("iaPerfilTipo", perfil.tipo || "Sin perfil");
    texto(
        "iaPerfilDetalle",
        perfil.descripcion ||
        perfil.foco ||
        "Aún no hay datos suficientes."
    );

    texto("iaTrayectoriaEstado", trayectoria.estado || "Sin datos");
    texto(
        "iaTrayectoriaDetalle",
        trayectoria.interpretacion ||
        "Se requiere historial emocional para estimar trayectoria."
    );

    texto("iaSiguientePaso", accion.titulo || decision.siguientePaso || "Captura inicial");
    texto(
        "iaSiguienteDetalle",
        accion.detalle ||
        decision.siguientePaso ||
        "Registra tu estado emocional."
    );

    texto("iaMatrizNivel", matriz.nivel || "Inicial");
    texto(
        "iaMatrizDetalle",
        matriz.objetivo ||
        matriz.intervencion ||
        "Construir línea base de seguimiento."
    );

    renderPreguntasSeguimiento(ia.preguntasSeguimiento || []);
}

function renderPreguntasSeguimiento(preguntas) {

    const contenedor =
        document.getElementById("iaPreguntasSeguimiento");

    if (!contenedor)
        return;

    const seguimiento = estadoDashboard.seguimiento;
    const preguntasBase = Array.isArray(preguntas)
        ? preguntas.filter(Boolean).slice(0, 3)
        : [];

    seguimiento.preguntas = preguntasBase.length
        ? preguntasBase
        : [
            "¿Qué emoción predominó hoy?",
            "¿Qué situación influyó más en tu estado?",
            "¿Qué acción pequeña puedes realizar antes de terminar el día?"
        ];

    seguimiento.tareas = [
        "Actualizar registro emocional",
        "Revisar la recomendación actual",
        "Realizar el siguiente paso del plan"
    ];

    const porcentaje = Math.round(
        seguimiento.completadas.filter(Boolean).length /
        seguimiento.completadas.length * 100
    );

    const historial = seguimiento.historial
        .slice(0, 7)
        .reverse();

    contenedor.innerHTML = `
        <div class="followup-web-head">
            <div>
                <span class="followup-kicker">Seguimiento de hoy</span>
                <strong>Registra tu avance y responde brevemente</strong>
            </div>
            <span id="seguimientoWebEstado" class="followup-state">
                ${seguimiento.sucio ? "Cambios sin guardar" : `${porcentaje}% completado`}
            </span>
        </div>

        <div class="followup-web-progress" aria-label="Avance del seguimiento">
            <span id="seguimientoWebBar" style="width:${porcentaje}%"></span>
        </div>

        <div class="followup-web-tasks">
            ${seguimiento.tareas.map((tarea, index) => `
                <label class="followup-task ${seguimiento.completadas[index] ? "is-done" : ""}">
                    <input type="checkbox" data-followup-task="${index}"
                        ${seguimiento.completadas[index] ? "checked" : ""}>
                    <span class="followup-task-check"><i class="fa-solid fa-check"></i></span>
                    <span>${escapeHtml(tarea)}</span>
                </label>
            `).join("")}
        </div>

        <div class="followup-web-questions">
            ${seguimiento.preguntas.map((pregunta, index) => `
                <label class="followup-question">
                    <span><b>${index + 1}</b>${escapeHtml(pregunta)}</span>
                    <textarea data-followup-answer="${index}" rows="2"
                        maxlength="500" placeholder="Escribe una respuesta breve...">${escapeHtml(seguimiento.respuestas[index] || "")}</textarea>
                </label>
            `).join("")}
        </div>

        <div class="followup-web-footer">
            <small>
                ${historial.length
                    ? `Registros de seguimiento recientes: ${historial.length}`
                    : "Aún no hay avances guardados."}
            </small>
            <button id="seguimientoWebGuardar" type="button" class="followup-save-button">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                Guardar avance
            </button>
        </div>
    `;

    contenedor
        .querySelectorAll("[data-followup-task]")
        .forEach(input => {
            input.addEventListener("change", event => {
                const index = Number(event.target.dataset.followupTask);
                seguimiento.completadas[index] = event.target.checked;
                seguimiento.sucio = true;
                event.target.closest(".followup-task")
                    ?.classList.toggle("is-done", event.target.checked);
                actualizarSeguimientoWebUI();
            });
        });

    contenedor
        .querySelectorAll("[data-followup-answer]")
        .forEach(input => {
            input.addEventListener("input", event => {
                const index = Number(event.target.dataset.followupAnswer);
                seguimiento.respuestas[index] = event.target.value;
                seguimiento.sucio = true;
                actualizarSeguimientoWebUI();
            });
        });

    document
        .getElementById("seguimientoWebGuardar")
        ?.addEventListener("click", guardarSeguimientoWeb);
}

function actualizarSeguimientoWebUI() {

    const seguimiento = estadoDashboard.seguimiento;
    const porcentaje = Math.round(
        seguimiento.completadas.filter(Boolean).length /
        seguimiento.completadas.length * 100
    );

    const estado = document.getElementById("seguimientoWebEstado");
    const barra = document.getElementById("seguimientoWebBar");

    if (estado) {
        estado.textContent = seguimiento.sucio
            ? "Cambios sin guardar"
            : `${porcentaje}% completado`;
    }

    if (barra)
        barra.style.width = `${porcentaje}%`;
}

async function guardarSeguimientoWeb() {

    const seguimiento = estadoDashboard.seguimiento;
    const tieneContenido =
        seguimiento.completadas.some(Boolean) ||
        seguimiento.respuestas.some(respuesta => respuesta.trim());

    if (!tieneContenido) {
        window.alert("Completa al menos una actividad o respuesta antes de guardar.");
        return;
    }

    if (seguimiento.guardando)
        return;

    seguimiento.guardando = true;
    const boton = document.getElementById("seguimientoWebGuardar");

    if (boton) {
        boton.disabled = true;
        boton.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    }

    const ia = estadoDashboard.ia || {};
    const accion =
        ia.accionPrioritaria?.titulo ||
        ia.accionPrioritaria?.detalle ||
        ia.recomendaciones?.[0] ||
        "Mantener el seguimiento emocional.";
    const riesgo =
        ia.nivelRiesgo ||
        ia.nivel ||
        ia.clasificacionRiesgo ||
        "En observación";

    guardarSeguimientoLocal();

    try {
        const res = await fetch(
            `${API}/Seguimiento/usuario/${usuarioId}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fecha: new Date().toISOString(),
                    tareasCompletadas: seguimiento.completadas.filter(Boolean).length,
                    totalTareas: seguimiento.completadas.length,
                    respuesta1: seguimiento.respuestas[0] || "",
                    respuesta2: seguimiento.respuestas[1] || "",
                    respuesta3: seguimiento.respuestas[2] || "",
                    accionPrincipal: accion,
                    nivelRiesgo: riesgo
                })
            }
        );

        if (!res.ok)
            throw new Error("No se pudo sincronizar el seguimiento.");

        const resultado = await res.json();
        const hoy = {
            fecha: new Date().toISOString(),
            tareasCompletadas: seguimiento.completadas.filter(Boolean).length,
            totalTareas: seguimiento.completadas.length,
            progreso: resultado.progreso ?? 0,
            respuesta1: seguimiento.respuestas[0] || "",
            respuesta2: seguimiento.respuestas[1] || "",
            respuesta3: seguimiento.respuestas[2] || "",
            accionPrincipal: accion,
            nivelRiesgo: riesgo
        };

        seguimiento.hoy = hoy;
        seguimiento.historial = [
            hoy,
            ...seguimiento.historial.filter(item =>
                new Date(item.fecha).toISOString().slice(0, 10) !==
                hoy.fecha.slice(0, 10)
            )
        ];
        seguimiento.sucio = false;
        guardarSeguimientoLocal();
        renderPreguntasSeguimiento(seguimiento.preguntas);
    } catch {
        seguimiento.sucio = false;
        actualizarSeguimientoWebUI();
        window.alert("El avance quedó guardado localmente, pero no pudo sincronizarse con la API.");
    } finally {
        seguimiento.guardando = false;
        const actual = document.getElementById("seguimientoWebGuardar");
        if (actual) {
            actual.disabled = false;
            actual.innerHTML =
                `<i class="fa-solid fa-cloud-arrow-up"></i> Guardar avance`;
        }
        actualizarSeguimientoWebUI();
    }
}

function renderPlanPersonal(ia) {

    const recomendaciones =
        Array.isArray(ia.recomendaciones)
            ? ia.recomendaciones
            : [];

    const accion =
        ia.accionPrioritaria || {};

    const trayectoria =
        ia.trayectoriaRiesgo || {};

    texto(
        "planTitulo",
        accion.titulo ||
        ia.prioridad ||
        "Monitoreo preventivo"
    );

    texto(
        "planDetalle",
        accion.detalle ||
        trayectoria.interpretacion ||
        ia.semaforo?.accion ||
        recomendaciones[0] ||
        "Continúa con tus registros emocionales y evaluaciones."
    );

    texto("planScore", ia.score ?? 0);
    texto("planConfianza", `${ia.confianza ?? 0}%`);
    texto(
        "planTendencia",
        trayectoria.direccion
            ? `${ia.tendencia || "Sin datos"} | ${trayectoria.direccion}`
            : ia.tendencia || "Sin datos"
    );
    texto(
        "planProximoPaso",
        accion.plazo
            ? `${accion.plazo}: ${accion.titulo || "Siguiente acción"}`
            : recomendaciones[0] ||
        ia.semaforo?.accion ||
        "Registrar seguimiento"
    );
}

function renderRutaCuidado() {

    const ia =
        estadoDashboard.ia || {};

    const registros =
        estadoDashboard.registros || [];

    const ultimoRegistro =
        registros.length
            ? registros[registros.length - 1]
            : null;

    const score =
        Number(ia.score || 0);

    const nivel =
        String(ia.nivel || "Sin datos");

    const tendencia =
        String(ia.tendencia || "Sin datos");

    const confianza =
        Number(ia.confianza || 0);

    const diasSinRegistro =
        ultimoRegistro?.fecha
            ? Math.max(
                0,
                Math.floor(
                    (Date.now() - new Date(ultimoRegistro.fecha).getTime()) /
                    86400000
                )
            )
            : null;

    texto("rutaPrioridad", ia.prioridad || prioridadPorScore(score));
    texto("rutaTitulo", tituloRuta(nivel, score));
    texto(
        "rutaDetalle",
        ia.semaforo?.accion ||
        "Completa tus registros para personalizar mejor el seguimiento."
    );

    renderPaso(
        "pasoRegistro",
        "pasoRegistroTexto",
        textoPasoRegistro(diasSinRegistro),
        estadoPasoRegistro(diasSinRegistro)
    );

    renderPaso(
        "pasoEvaluacion",
        "pasoEvaluacionTexto",
        textoPasoEvaluacion(estadoDashboard.phq, estadoDashboard.estres),
        estadoPasoEvaluacion(estadoDashboard.phq, estadoDashboard.estres)
    );

    renderPaso(
        "pasoCita",
        "pasoCitaTexto",
        textoPasoCita(estadoDashboard.cita, score, nivel),
        estadoPasoCita(estadoDashboard.cita, score, nivel)
    );

    renderPaso(
        "pasoAutocuidado",
        "pasoAutocuidadoTexto",
        textoPasoAutocuidado(ia, ultimoRegistro),
        estadoPasoAutocuidado(score, tendencia)
    );

    texto("senalDominante", senalDominante(ia, ultimoRegistro));
    texto("frecuenciaSugerida", frecuenciaSugerida(score, tendencia, diasSinRegistro));
    texto("factorProtector", factorProtector(confianza, registros.length, ia));
}

function renderAuditoriaIA(ia) {

    const calidad =
        ia.calidadDatos || {};

    texto(
        "iaCalidadDatos",
        calidad.nivel
            ? `${calidad.nivel} | ${calidad.porcentaje ?? 0}%`
            : "Inicial"
    );

    texto(
        "iaCalidadDetalle",
        calidad.interpretacion ||
        "Completa registros y evaluaciones para aumentar confiabilidad."
    );

    const volatilidad =
        ia.volatilidad || {};

    texto(
        "iaVolatilidad",
        volatilidad.nivel
            ? `${volatilidad.nivel} | ${volatilidad.indice ?? 0}/100`
            : "Sin datos"
    );

    texto(
        "iaVolatilidadDetalle",
        volatilidad.interpretacion ||
        "Se requieren más registros para calcular variación emocional."
    );

    renderPlanSeguimientoIA(
        ia.planSeguimiento || {},
        ia.accionPrioritaria || {},
        ia.perfilClinico || {},
        ia.trayectoriaRiesgo || {}
    );
    renderBanderasIA(ia.banderasClinicas || []);
    renderProtectoresIA(ia.factoresProtectores || []);
}

function renderPlanSeguimientoIA(
    plan,
    accion = {},
    perfil = {},
    trayectoria = {}) {

    const contenedor =
        document.getElementById("iaPlanSeguimiento");

    if (!contenedor)
        return;

    const items = [
        ["Acción prioritaria", accion.detalle],
        ["Perfil IA", perfil.descripcion],
        ["Trayectoria", trayectoria.interpretacion],
        ["Registro", plan.frecuenciaRegistro],
        ["Evaluación", plan.evaluacion],
        ["Contacto", plan.contactoProfesional],
        ["Autocuidado", plan.autocuidado]
    ].filter(x => x[1]);

    if (!items.length) {
        contenedor.innerHTML =
            `<div class="audit-empty">Completa tus evaluaciones para generar un plan.</div>`;
        return;
    }

    contenedor.innerHTML =
        items.map(x => `
            <div class="audit-item">
                <b>${escapeHtml(x[0])}</b>
                <span>${escapeHtml(x[1])}</span>
            </div>
        `).join("");
}

function renderBanderasIA(banderas) {

    const contenedor =
        document.getElementById("iaBanderas");

    if (!contenedor)
        return;

    if (!banderas.length) {
        contenedor.innerHTML =
            `<div class="audit-empty">Sin banderas activas.</div>`;
        return;
    }

    contenedor.innerHTML =
        banderas.slice(0, 4).map(x => `
            <div class="audit-item">
                <b>${escapeHtml(x.tipo || "Bandera")}</b>
                <span>${escapeHtml(x.descripcion || "")}</span>
                <em>${escapeHtml(x.severidad || "-")}</em>
            </div>
        `).join("");
}

function renderProtectoresIA(protectores) {

    const contenedor =
        document.getElementById("iaProtectores");

    if (!contenedor)
        return;

    if (!protectores.length) {
        contenedor.innerHTML =
            `<div class="audit-empty">Aumenta constancia de registro para detectar factores protectores.</div>`;
        return;
    }

    contenedor.innerHTML =
        protectores.slice(0, 4).map(x => `
            <div class="audit-item protector">
                <b>${escapeHtml(x.fuente || "Protector")}</b>
                <span>${escapeHtml(x.descripcion || "")}</span>
                <em>Peso ${Number(x.peso || 0)}</em>
            </div>
        `).join("");
}

function renderPaso(idPaso, idTexto, mensaje, estado) {

    const paso =
        document.getElementById(idPaso);

    if (paso) {
        paso.classList.remove("ok", "warning", "danger");
        if (estado)
            paso.classList.add(estado);
    }

    texto(idTexto, mensaje);
}

function tituloRuta(nivel, score) {

    const normalizado =
        normalizarTexto(nivel);

    if (normalizado.includes("critico") || score >= 85)
        return "Plan prioritario de seguridad emocional";

    if (normalizado.includes("alto") || score >= 70)
        return "Plan de seguimiento intensivo";

    if (normalizado.includes("medio") || score >= 35)
        return "Plan de monitoreo cercano";

    if (normalizado.includes("sin datos"))
        return "Plan inicial de captura";

    return "Plan preventivo de bienestar";
}

function prioridadPorScore(score) {

    if (score >= 70)
        return "Alta";

    if (score >= 35)
        return "Media";

    if (score > 0)
        return "Baja";

    return "Inicial";
}

function textoPasoRegistro(dias) {

    if (dias === null)
        return "Realiza tu primer registro emocional para iniciar la línea base.";

    if (dias === 0)
        return "Registro realizado hoy. Mantén observación de cambios importantes.";

    if (dias === 1)
        return "Han pasado 24 horas. Conviene registrar cómo te sientes hoy.";

    return `Han pasado ${dias} días desde tu último registro. Actualiza tu seguimiento.`;
}

function estadoPasoRegistro(dias) {

    if (dias === null || dias >= 3)
        return "warning";

    if (dias === 0)
        return "ok";

    return "";
}

function textoPasoEvaluacion(phq, estres) {

    if (!phq && !estres)
        return "Completa PHQ-9 y el test de estrés para mejorar tu seguimiento.";

    if (phq >= 15 || estres >= 49)
        return "Tus resultados sugieren revisión profesional y seguimiento cercano.";

    if (phq >= 10 || estres >= 37)
        return "Hay señales moderadas. Repite evaluación durante la semana.";

    return "Evaluaciones registradas. Mantén actualización periódica.";
}

function estadoPasoEvaluacion(phq, estres) {

    if (phq >= 15 || estres >= 49)
        return "danger";

    if (!phq && !estres)
        return "warning";

    if (phq >= 10 || estres >= 37)
        return "warning";

    return "ok";
}

function textoPasoCita(cita, score, nivel) {

    if (cita?.fecha)
        return `Próxima cita: ${new Date(cita.fecha).toLocaleString("es-MX")}.`;

    const normalizado =
        normalizarTexto(nivel);

    if (score >= 35 ||
        normalizado.includes("medio") ||
        normalizado.includes("alto") ||
        normalizado.includes("critico")) {
        return "Considera solicitar apoyo profesional para revisar señales de riesgo.";
    }

    return "Sin cita próxima. Puedes consultar apoyo profesional si necesitas acompañamiento.";
}

function estadoPasoCita(cita, score, nivel) {

    if (cita?.fecha)
        return "ok";

    const normalizado =
        normalizarTexto(nivel);

    if (score >= 70 || normalizado.includes("alto") || normalizado.includes("critico"))
        return "danger";

    if (score >= 35 || normalizado.includes("medio"))
        return "warning";

    return "";
}

function textoPasoAutocuidado(ia, registro) {

    const recomendacion =
        Array.isArray(ia.recomendaciones)
            ? ia.recomendaciones[0]
            : "";

    if (recomendacion)
        return recomendacion;

    if (registro?.nivelEstres >= 7)
        return "Reduce carga mental y realiza una pausa de respiración guiada.";

    if (registro?.nivelAnimo > 0 && registro.nivelAnimo <= 4)
        return "Busca una actividad breve de apoyo emocional o contacto de confianza.";

    return "Mantén sueño, alimentación, movimiento ligero y registro preventivo.";
}

function estadoPasoAutocuidado(score, tendencia) {

    const normalizado =
        normalizarTexto(tendencia);

    if (score >= 70 || normalizado.includes("deterioro"))
        return "danger";

    if (score >= 35)
        return "warning";

    return "ok";
}

function senalDominante(ia, registro) {

    if (ia.senalDominante?.fuente &&
        ia.senalDominante.fuente !== "Sin señal dominante") {
        return `${ia.senalDominante.fuente} | peso ${ia.senalDominante.peso ?? 0}`;
    }

    if (ia.perfilClinico?.tipo)
        return ia.perfilClinico.tipo;

    const dimensiones =
        ia.dimensiones || {};

    const mapa =
        Object.entries({
            "Depresión": dimensiones.depresion || 0,
            "Test de estrés": dimensiones.estresLaboral || 0,
            "Estrés diario": dimensiones.estresDiario || 0,
            "Ánimo bajo": dimensiones.animoBajo || 0,
            "Deterioro": dimensiones.deterioro || 0
        }).sort((a, b) => Number(b[1]) - Number(a[1]));

    if (mapa[0] && Number(mapa[0][1]) > 0)
        return `${mapa[0][0]} (${mapa[0][1]}/100)`;

    if (registro)
        return `${registro.categoria || "Registro"} | ánimo ${registro.nivelAnimo}/10`;

    return "Sin datos";
}

function frecuenciaSugerida(score, tendencia, diasSinRegistro) {

    const normalizado =
        normalizarTexto(tendencia);

    if (score >= 70 || normalizado.includes("deterioro"))
        return "Registrar diario y buscar seguimiento";

    if (score >= 35 || diasSinRegistro === null || diasSinRegistro >= 3)
        return "Registrar 4 veces por semana";

    return "Registrar 3 veces por semana";
}

function factorProtector(confianza, totalRegistros, ia) {

    const adherencia =
        Number(ia.dimensiones?.adherencia || 0);

    if (adherencia >= 70 || totalRegistros >= 7)
        return "Buena constancia de registro";

    if (confianza >= 70)
        return "Datos suficientes para seguimiento";

    if (totalRegistros > 0)
        return "Continuar aumentando registros";

    return "Construir constancia";
}

function renderListaFactores(factores) {

    const contenedor =
        document.getElementById("iaFactores");

    if (!contenedor)
        return;

    if (!factores.length) {
        contenedor.innerHTML =
            `<div class="ia-empty">Sin factores de riesgo activos.</div>`;
        return;
    }

    contenedor.innerHTML =
        factores.slice(0, 5).map(f => `
            <div class="ia-item">
                <strong>${escapeHtml(f.fuente || "Factor")}</strong>
                <span>${escapeHtml(f.descripcion || "")}</span>
                <em>${escapeHtml(f.severidad || "-")} | Peso ${Number(f.peso || 0)}</em>
            </div>
        `).join("");
}

function renderListaRecomendaciones(recomendaciones) {

    const contenedor =
        document.getElementById("iaRecomendaciones");

    if (!contenedor)
        return;

    if (!recomendaciones.length) {
        contenedor.innerHTML =
            `<div class="ia-empty">Completa más registros para personalizar recomendaciones.</div>`;
        return;
    }

    contenedor.innerHTML =
        recomendaciones.slice(0, 4).map((r, i) => `
            <div class="ia-item recommendation">
                <strong>Acción ${i + 1}</strong>
                <span>${escapeHtml(r)}</span>
            </div>
        `).join("");
}

function actualizarRadarIA(dimensiones) {

    const c =
        document.getElementById("graficaRadar");

    if (!c || typeof Chart === "undefined")
        return;

    if (chartRadar)
        chartRadar.destroy();

    chartRadar =
        new Chart(c, {
            type: "radar",
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
                    label: "Dimensiones IA",
                    data: [
                        clamp(dimensiones.depresion || 0, 0, 100),
                        clamp(dimensiones.estresLaboral || 0, 0, 100),
                        clamp(dimensiones.estresDiario || 0, 0, 100),
                        clamp(dimensiones.animoBajo || 0, 0, 100),
                        clamp(dimensiones.deterioro || 0, 0, 100),
                        clamp(dimensiones.adherencia || 0, 0, 100)
                    ],
                    borderColor: "#7658d8",
                    backgroundColor: "rgba(118, 88, 216, .14)",
                    pointBackgroundColor: "#7658d8",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: opcionesRadar()
        });

    renderInsightDimensionesIA(dimensiones);
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

        estadoDashboard.cita = cita;

        texto(
            "citaBox",
            `${new Date(cita.fecha).toLocaleString()}`
        );

        renderRutaCuidado();

    } catch {

        estadoDashboard.cita = null;
        texto("citaBox", "Sin citas");
        renderRutaCuidado();

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

    configurarChart();

    const ultimos =
        datos.slice(-10);

    renderResumenTendencia(ultimos, datos.length);

    const gradienteAnimo =
        crearGradiente(c1, "rgba(47, 111, 228, .2)", "rgba(47, 111, 228, 0)");

    const gradienteEstres =
        crearGradiente(c1, "rgba(217, 87, 79, .14)", "rgba(217, 87, 79, 0)");

    chartLinea =
        new Chart(c1, {
            type: "line",
            data: {
                labels:
                    ultimos.map(x => formatearFechaCorta(x.fecha)),
                datasets: [
                    {
                        label: "Ánimo",
                        data:
                            ultimos.map(x => Number(x.nivelAnimo || 0)),
                        borderColor:
                            "#2f6fe4",
                        backgroundColor:
                            gradienteAnimo,
                        borderWidth: 3,
                        fill: true,
                        pointBackgroundColor: "#2f6fe4",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        tension: .38
                    },
                    {
                        label: "Estrés",
                        data:
                            ultimos.map(x => Number(x.nivelEstres || 0)),
                        borderColor:
                            "#d9574f",
                        backgroundColor:
                            gradienteEstres,
                        borderWidth: 3,
                        borderDash: [6, 5],
                        fill: true,
                        pointBackgroundColor: "#d9574f",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        tension: .38
                    }
                ]
            },
            options: opcionesLinea(),
            plugins: [pluginBandasClinicas()]
        });

    const mapa = {};

    datos.forEach(x => {
        const categoria =
            x.categoria || "Sin categoría";

        mapa[categoria] =
            (mapa[categoria] || 0) + 1;
    });

    const categoriasOrdenadas =
        Object.entries(mapa)
            .sort((a, b) => b[1] - a[1]);

    renderResumenCategorias(categoriasOrdenadas, datos.length);

    chartDona =
        new Chart(c2, {
            type: "doughnut",
            data: {
                labels:
                    categoriasOrdenadas.map(x => x[0]),
                datasets: [{
                    data:
                        categoriasOrdenadas.map(x => x[1]),
                    backgroundColor: [
                        "#2f6fe4",
                        "#0e938b",
                        "#d99327",
                        "#d9574f",
                        "#7658d8",
                        "#64748b"
                    ],
                    borderColor: "#ffffff",
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: opcionesDona(),
            plugins: [pluginCentroDona(datos.length)]
        });

}

function renderResumenTendencia(ultimos, totalRegistros) {

    const promedioAnimo =
        promedioNumerico(ultimos, "nivelAnimo");

    const promedioEstres =
        promedioNumerico(ultimos, "nivelEstres");

    const primero =
        ultimos[0];

    const ultimo =
        ultimos[ultimos.length - 1];

    const cambioAnimo =
        primero && ultimo
            ? Number(ultimo.nivelAnimo || 0) - Number(primero.nivelAnimo || 0)
            : 0;

    const cambioEstres =
        primero && ultimo
            ? Number(ultimo.nivelEstres || 0) - Number(primero.nivelEstres || 0)
            : 0;

    texto("chartPromAnimo", `${promedioAnimo.toFixed(1)}/10`);
    texto("chartPromEstres", `${promedioEstres.toFixed(1)}/10`);
    texto("chartRegistros", totalRegistros);
    texto(
        "chartCambio",
        `${formatearCambio(cambioAnimo)} ánimo | ${formatearCambio(cambioEstres)} estrés`
    );

    texto(
        "chartInsight",
        interpretarTendencia(promedioAnimo, promedioEstres, cambioAnimo, cambioEstres)
    );
}

function renderResumenCategorias(categoriasOrdenadas, totalRegistros) {

    if (!categoriasOrdenadas.length) {
        texto("categoriaInsight", "Sin categoría predominante.");
        return;
    }

    const [categoria, cantidad] =
        categoriasOrdenadas[0];

    const participacion =
        porcentaje(cantidad, totalRegistros);

    texto(
        "categoriaInsight",
        `Categoría predominante: ${categoria} (${participacion}% de los registros).`
    );
}

function renderResumenGraficasSinDatos() {

    texto("chartPromAnimo", "-");
    texto("chartPromEstres", "-");
    texto("chartCambio", "-");
    texto("chartRegistros", "0");
    texto("chartInsight", "Registra emociones para generar lectura de tendencia.");
    texto("categoriaInsight", "Sin categoría predominante.");
}

/* ===================================================== */
function crearGraficaTests(phq, estres) {

    const c =
        document.getElementById("graficaTests");

    if (!c) return;

    if (chartTests)
        chartTests.destroy();

    texto(
        "chartPhqNivel",
        `${nivelPHQ(phq)} | ${porcentaje(phq, 27)}%`
    );

    texto(
        "chartEstresNivel",
        `${nivelEstres(estres)} | ${porcentaje(estres, 60)}%`
    );

    chartTests =
        new Chart(c, {
            type: "bar",
            data: {
                labels: [
                    "PHQ-9",
                    "Test de estrés"
                ],
                datasets: [{
                    label: "Severidad",
                    data: [
                        porcentaje(phq, 27),
                        porcentaje(estres, 60)
                    ],
                    backgroundColor: [
                        "#2f6fe4",
                        "#d9574f"
                    ],
                    borderRadius: 8,
                    barThickness: 24
                }]
            },
            options: opcionesBarras()
        });
}

/* ===================================================== */
function crearRadar(phq, estres) {

    const c =
        document.getElementById("graficaRadar");

    if (!c || typeof Chart === "undefined") return;

    configurarChart();

    if (chartRadar)
        chartRadar.destroy();

    chartRadar =
        new Chart(c, {
            type: "radar",
            data: {
                labels: [
                    "Depresión",
                    "Estrés",
                    "Ánimo",
                    "Equilibrio",
                    "Riesgo"
                ],
                datasets: [{
                    label: "Perfil emocional",
                    data: [
                        porcentaje(phq, 27),
                        porcentaje(estres, 60),
                        80,
                        phq <= 4 && estres <= 12 ? 82 : 55,
                        Math.max(porcentaje(phq, 27), porcentaje(estres, 60))
                    ],
                    borderColor: "#1f5eff",
                    backgroundColor: "rgba(31, 94, 255, .16)",
                    pointBackgroundColor: "#1f5eff",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: opcionesRadar()
        });

    renderInsightPerfil(phq, estres);
}

/* ===================================================== */
function configurarChart() {

    if (typeof Chart === "undefined")
        return;

    Chart.defaults.font.family = "'Segoe UI', sans-serif";
    Chart.defaults.color = "#64748b";
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.tooltip.backgroundColor = "#172033";
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = {
        family: "'Segoe UI', sans-serif",
        weight: "700"
    };
    Chart.defaults.plugins.tooltip.bodyFont = {
        family: "'Segoe UI', sans-serif"
    };
}

function opcionesBase() {

    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 550,
            easing: "easeOutQuart"
        },
        interaction: {
            mode: "index",
            intersect: false
        },
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    padding: 18,
                    color: "#475569",
                    font: {
                        size: 11,
                        weight: "700"
                    }
                }
            }
        }
    };
}

function opcionesLinea() {

    const opciones =
        opcionesBase();

    opciones.scales = {
        x: {
            grid: { display: false },
            ticks: {
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 7
            }
        },
        y: {
            min: 0,
            max: 10,
            ticks: {
                stepSize: 2,
                padding: 8
            },
            grid: {
                color: "rgba(148, 163, 184, .2)",
                drawBorder: false
            }
        }
    };

    return opciones;
}

function opcionesDona() {

    const opciones =
        opcionesBase();

    opciones.cutout = "72%";
    opciones.plugins.legend.position = "bottom";
    opciones.plugins.legend.labels.padding = 14;
    opciones.spacing = 3;

    return opciones;
}

function opcionesBarras() {

    const opciones =
        opcionesBase();

    opciones.indexAxis = "y";
    opciones.plugins.legend.display = false;
    opciones.scales = {
        x: {
            min: 0,
            max: 100,
            ticks: {
                callback: value => `${value}%`
            },
            grid: {
                color: "rgba(148, 163, 184, .2)",
                drawBorder: false
            }
        },
        y: {
            grid: {
                display: false,
                drawBorder: false
            }
        }
    };

    return opciones;
}

function opcionesRadar() {

    const opciones =
        opcionesBase();

    opciones.plugins.legend.display = false;
    opciones.scales = {
        r: {
            angleLines: {
                color: "rgba(148, 163, 184, .24)"
            },
            grid: {
                color: "rgba(148, 163, 184, .22)"
            },
            pointLabels: {
                color: "#475569",
                font: {
                    size: 12,
                    weight: "700"
                }
            },
            min: 0,
            max: 100,
            ticks: {
                backdropColor: "transparent",
                stepSize: 25
            }
        }
    };

    return opciones;
}

function pluginBandasClinicas() {

    return {
        id: "bandasClinicasMindCare",
        beforeDatasetsDraw(chart) {

            const area =
                chart.chartArea;

            const escalaY =
                chart.scales.y;

            if (!area || !escalaY)
                return;

            const ctx =
                chart.ctx;

            const bandas = [
                {
                    desde: 0,
                    hasta: 3.5,
                    color: "rgba(34, 197, 94, .06)"
                },
                {
                    desde: 3.5,
                    hasta: 6.5,
                    color: "rgba(245, 158, 11, .07)"
                },
                {
                    desde: 6.5,
                    hasta: 10,
                    color: "rgba(239, 68, 68, .06)"
                }
            ];

            ctx.save();

            bandas.forEach(banda => {
                const yAlta =
                    escalaY.getPixelForValue(banda.hasta);

                const yBaja =
                    escalaY.getPixelForValue(banda.desde);

                ctx.fillStyle = banda.color;
                ctx.fillRect(
                    area.left,
                    yAlta,
                    area.right - area.left,
                    yBaja - yAlta
                );
            });

            ctx.restore();
        }
    };
}

function pluginCentroDona(total) {

    return {
        id: "centroDonaMindCare",
        afterDraw(chart) {

            const meta =
                chart.getDatasetMeta(0);

            const punto =
                meta?.data?.[0];

            if (!punto)
                return;

            const ctx =
                chart.ctx;

            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#172033";
            ctx.font = "900 22px 'Segoe UI'";
            ctx.fillText(total, punto.x, punto.y - 7);
            ctx.fillStyle = "#64748b";
            ctx.font = "800 11px 'Segoe UI'";
            ctx.fillText("registros", punto.x, punto.y + 13);
            ctx.restore();
        }
    };
}

function renderInsightPerfil(phq, estres) {

    const severidad =
        Math.max(
            porcentaje(phq, 27),
            porcentaje(estres, 60)
        );

    if (severidad >= 65) {
        texto(
            "perfilInsight",
            "Perfil con elevación importante. Se recomienda revisión clínica prioritaria y seguimiento cercano."
        );
        return;
    }

    if (severidad >= 35) {
        texto(
            "perfilInsight",
            "Perfil con señales moderadas. Conviene mantener monitoreo semanal y observar cambios de tendencia."
        );
        return;
    }

    texto(
        "perfilInsight",
        "Perfil dentro de rango bajo. Mantener registro preventivo y hábitos de autocuidado."
    );
}

function renderInsightDimensionesIA(dimensiones) {

    const mapa =
        Object.entries({
            depresion: dimensiones.depresion || 0,
            estresLaboral: dimensiones.estresLaboral || 0,
            estresDiario: dimensiones.estresDiario || 0,
            animoBajo: dimensiones.animoBajo || 0,
            deterioro: dimensiones.deterioro || 0,
            adherencia: dimensiones.adherencia || 0
        })
        .sort((a, b) => Number(b[1]) - Number(a[1]));

    const [dimension, valor] =
        mapa[0] || ["sinDatos", 0];

    if (Number(valor) <= 0) {
        texto(
            "perfilInsight",
            "Esperando más datos para construir un perfil integrado de IA."
        );
        return;
    }

    const etiquetas = {
        depresion: "síntomas depresivos",
        estresLaboral: "test de estrés",
        estresDiario: "estrés diario",
        animoBajo: "ánimo bajo",
        deterioro: "deterioro reciente",
        adherencia: "adherencia de registro"
    };

    texto(
        "perfilInsight",
        `Dimensión más relevante: ${etiquetas[dimension] || dimension} (${valor}/100).`
    );
}

function interpretarTendencia(promedioAnimo, promedioEstres, cambioAnimo, cambioEstres) {

    if (promedioAnimo <= 4 || promedioEstres >= 7) {
        return "Lectura clínica: se observan señales de atención. Priorizar seguimiento y revisar factores asociados.";
    }

    if (cambioAnimo < -2 || cambioEstres > 2) {
        return "Lectura clínica: existe deterioro reciente. Conviene repetir registro en las próximas 24-48 horas.";
    }

    if (promedioAnimo >= 7 && promedioEstres <= 4) {
        return "Lectura clínica: patrón favorable. Mantener hábitos protectores y registro preventivo.";
    }

    return "Lectura clínica: patrón estable con vigilancia preventiva.";
}

function promedioNumerico(lista, campo) {

    if (!lista.length)
        return 0;

    const total =
        lista.reduce(
            (acum, item) => acum + Number(item[campo] || 0),
            0
        );

    return total / lista.length;
}

function formatearCambio(valor) {

    if (valor > 0)
        return `+${valor.toFixed(1)}`;

    return valor.toFixed(1);
}

function crearGradiente(canvas, inicio, fin) {

    const ctx =
        canvas.getContext("2d");

    const gradiente =
        ctx.createLinearGradient(0, 0, 0, 320);

    gradiente.addColorStop(0, inicio);
    gradiente.addColorStop(1, fin);

    return gradiente;
}

function formatearFechaCorta(fecha) {

    if (!fecha)
        return "-";

    return new Date(fecha)
        .toLocaleDateString(
            "es-MX",
            {
                day: "2-digit",
                month: "short"
            }
        );
}

function porcentaje(valor, maximo) {

    if (!maximo)
        return 0;

    return clamp(
        Math.round((Number(valor || 0) / maximo) * 100),
        0,
        100
    );
}

function clamp(valor, minimo, maximo) {

    return Math.max(
        minimo,
        Math.min(maximo, Number(valor || 0))
    );
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
function irCitas() { location.href = "citas.html"; }
function irExpediente() { location.href = `historialusuario.html?id=${usuarioId}`; }

function logout() {
    localStorage.clear();
    location.href = "login.html";
}
/* =====================================================
REPORTE PDF
Diseño compacto, multipágina y orientado a seguimiento.
===================================================== */
function generarPDF() {

    if (!window.jspdf) {
        alert("No cargó jsPDF");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    const nombre =
        (localStorage.getItem("nombre") || "Usuario")
            .replace("Hola,", "")
            .trim()
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .join(" ");

    const leer = id => limpiarTexto(
        document.getElementById(id)?.innerText || "-"
    );

    const ia = leer("iaResultado");
    const alerta = leer("alertaBox");
    const test = leer("phq9Box");
    const nivel = leer("phq9Trend");
    const promedio = leer("promedioResultado");
    const consejo = leer("consejoBox");
    const decision = leer("iaDecisionTitulo");
    const decisionResumen = leer("iaDecisionResumen");
    const plan = leer("planTitulo");
    const planDetalle = leer("planDetalle");
    const factores = leer("iaFactores");
    const recomendaciones = leer("iaRecomendaciones");
    const seguimiento = estadoDashboard.seguimiento;
    const progreso = Math.round(
        seguimiento.completadas.filter(Boolean).length /
        seguimiento.completadas.length * 100
    );

    const fecha =
        new Date().toLocaleString("es-MX");

    const colors = {
        navy: [23, 32, 51],
        blue: [29, 102, 209],
        teal: [11, 129, 120],
        coral: [217, 87, 79],
        amber: [184, 117, 22],
        violet: [124, 58, 237],
        ink: [23, 32, 51],
        muted: [100, 116, 139],
        line: [219, 228, 238],
        soft: [247, 250, 252]
    };

    function header(pageTitle, pageLabel) {
        doc.setFillColor(...colors.navy);
        doc.rect(0, 0, pageWidth, 39, "F");
        doc.setFillColor(...colors.teal);
        doc.rect(0, 39, pageWidth, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(23);
        doc.text("MindCare", margin, 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(pageTitle, margin, 25);
        doc.setFontSize(8.5);
        doc.text(pageLabel, pageWidth - margin, 16, { align: "right" });
        doc.text(fecha, pageWidth - margin, 25, { align: "right" });
    }

    function footer() {
        doc.setDrawColor(...colors.line);
        doc.line(margin, 284, pageWidth - margin, 284);
        doc.setTextColor(...colors.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("MindCare | Seguimiento emocional", margin, 291);
        doc.text("No sustituye atención psicológica profesional", pageWidth - margin, 291, {
            align: "right"
        });
    }

    function agregarPaginacion() {
        const total = doc.getNumberOfPages();
        for (let pagina = 1; pagina <= total; pagina++) {
            doc.setPage(pagina);
            doc.setTextColor(...colors.muted);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text(
                `Uso personal y confidencial | Página ${pagina} de ${total}`,
                pageWidth / 2,
                291,
                { align: "center" }
            );
        }
    }

    function panel(title, value, x, y, width, accent, minHeight = 27) {
        const safeValue = String(value || "-");
        const lines = doc.splitTextToSize(safeValue, width - 18);
        const height = Math.max(minHeight, 14 + lines.length * 5.2);
        doc.setFillColor(...colors.soft);
        doc.setDrawColor(...colors.line);
        doc.roundedRect(x, y, width, height, 4, 4, "FD");
        doc.setFillColor(...accent);
        doc.roundedRect(x, y, 3.5, height, 3, 3, "F");
        doc.setTextColor(...colors.muted);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.8);
        doc.text(title.toUpperCase(), x + 10, y + 8);
        doc.setTextColor(...colors.ink);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.text(lines, x + 10, y + 16);
        return height;
    }

    function chartImage(id, x, y, width, height) {
        const canvas = document.getElementById(id);
        if (!canvas || !canvas.width || !canvas.height)
            return false;
        try {
            doc.addImage(canvas.toDataURL("image/png", 1), "PNG", x, y, width, height);
            return true;
        } catch {
            return false;
        }
    }

    /* Página 1: resumen ejecutivo del estado de seguimiento. */
    header("Reporte de seguimiento emocional", "Resumen 01");
    doc.setTextColor(...colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(`Resumen de ${nombre}`, margin, 54);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.muted);
    doc.setFontSize(9.5);
    doc.text("Lectura orientativa basada en registros y evaluaciones disponibles.", margin, 61);

    let y = 69;
    const heroHeight = 35;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, y, contentWidth, heroHeight, 5, 5, "FD");
    doc.setFillColor(...colors.blue);
    doc.roundedRect(margin, y, 4, heroHeight, 4, 4, "F");
    doc.setTextColor(...colors.blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("LECTURA PRINCIPAL", margin + 12, y + 10);
    doc.setTextColor(...colors.ink);
    doc.setFontSize(13);
    doc.text(doc.splitTextToSize(decision || alerta, 125), margin + 12, y + 20);
    doc.setTextColor(...colors.blue);
    doc.setFontSize(20);
    doc.text(`${progreso}%`, pageWidth - margin - 13, y + 17, { align: "right" });
    doc.setTextColor(...colors.muted);
    doc.setFontSize(7.5);
    doc.text("avance de hoy", pageWidth - margin - 13, y + 26, { align: "right" });
    y += heroHeight + 11;

    const gap = 8;
    const colWidth = (contentWidth - gap) / 2;
    const h1 = panel("Usuario", nombre, margin, y, colWidth, colors.blue);
    const h2 = panel("Nivel actual", alerta, margin + colWidth + gap, y, colWidth, colors.coral);
    y += Math.max(h1, h2) + gap;
    const h3 = panel("Evaluaciones", test, margin, y, colWidth, colors.violet);
    const h4 = panel("Interpretación", nivel, margin + colWidth + gap, y, colWidth, colors.teal);
    y += Math.max(h3, h4) + gap;
    const h5 = panel("Promedio emocional", promedio, margin, y, colWidth, colors.amber);
    const h6 = panel("Siguiente recomendación", consejo, margin + colWidth + gap, y, colWidth, colors.blue);
    y += Math.max(h5, h6) + 10;

    doc.setTextColor(...colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text("Tendencia reciente", margin, y);
    y += 5;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colors.line);
    doc.roundedRect(margin, y, contentWidth, 72, 5, 5, "FD");
    if (!chartImage("graficaLineas", margin + 7, y + 6, contentWidth - 14, 60)) {
        doc.setTextColor(...colors.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("No hay registros suficientes para mostrar la tendencia.", margin + 10, y + 35);
    }
    footer();

    /* Página 2: evaluación, factores y plan de seguimiento. */
    doc.addPage();
    header("Detalle del seguimiento", "Resumen 02");
    y = 54;
    doc.setTextColor(...colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Evaluación y acciones", margin, y);
    y += 10;
    const d1 = panel("Decisión orientativa", decisionResumen || ia, margin, y, contentWidth, colors.blue, 30);
    y += d1 + 9;
    const d2 = panel("Plan de seguimiento", `${plan}. ${planDetalle}`, margin, y, contentWidth, colors.teal, 30);
    y += d2 + 9;

    doc.setTextColor(...colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text("Perfil de evaluaciones", margin, y);
    y += 5;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colors.line);
    doc.roundedRect(margin, y, contentWidth, 63, 5, 5, "FD");
    chartImage("graficaTests", margin + 9, y + 7, 92, 48);
    chartImage("graficaCategorias", margin + 105, y + 7, 80, 48);
    y += 73;

    const d3 = panel("Factores observados", factores, margin, y, colWidth, colors.coral, 32);
    const d4 = panel("Recomendaciones", recomendaciones, margin + colWidth + gap, y, colWidth, colors.violet, 32);
    y += Math.max(d3, d4) + 10;
    panel(
        "Seguimiento registrado hoy",
        seguimiento.sucio
            ? "Hay cambios pendientes de guardar."
            : `${progreso}% completado. ${seguimiento.respuestas.filter(Boolean).length} respuestas registradas.`,
        margin,
        y,
        contentWidth,
        colors.teal,
        28
    );
    footer();

    agregarPaginacion();
    doc.setProperties({
        title: "MindCare | Reporte de seguimiento emocional",
        subject: "Resumen personal de seguimiento emocional",
        author: "MindCare"
    });

    const archivoNombre = (nombre || "Usuario")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    const sello = new Date().toISOString().slice(0, 10);
    doc.save(`MindCare_Reporte_${archivoNombre}_${sello}.pdf`);
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

function normalizarTexto(valor) {

    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
