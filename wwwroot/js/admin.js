const API = window.MINDCARE_API_BASE;

let grafica = null;
let graficaRiesgoAdmin = null;
let graficaTendenciaAdmin = null;
let graficaDimensionesAdmin = null;
let usuariosCache = [];

window.onload = async function () {

    if (!localStorage.getItem("token")) {
        location.href = "login.html";
        return;
    }

    if (!esSesionAdministrativa()) {
        redirigirPorPermisos();
        return;
    }

    await iniciar();
};

function esSesionAdministrativa() {

    return String(localStorage.getItem("rol") || "")
        .trim()
        .toLowerCase() === "admin";
}

function redirigirPorPermisos() {

    localStorage.removeItem("token");
    localStorage.removeItem("usuarioId");
    localStorage.removeItem("rol");

    sessionStorage.setItem(
        "mindcareSessionMessage",
        "Esta cuenta no tiene acceso administrativo o sus permisos cambiaron. Inicia sesión con una cuenta administradora."
    );

    location.replace("login.html");
}

async function iniciar() {

    const accesoAutorizado = await cargarResumen();

    if (!accesoAutorizado) {
        return;
    }

    await Promise.all([
        cargarUsuarios(),
        cargarPsicologos(),
        cargarVerificacionesProfesionales(),
        cargarCitas(),
        cargarAlertas(),
        cargarConsentimientos()
    ]);

    crearGrafica();
}

async function cargarResumen() {

    try {

        const res =
            await fetch(`${API}/Admin/resumen?t=${Date.now()}`);

        if (res.status === 403) {
            redirigirPorPermisos();
            return false;
        }

        if (!res.ok) throw new Error();

        const data =
            await res.json();

        texto("usuarios", data.usuarios);
        texto("psicologos", data.psicologos);
        texto("citas", data.citas);
        texto("riesgo", data.riesgoAlto);
        texto("tests", data.tests);
        texto("registros", data.registros);

        return true;

    } catch {

        toast("Error cargando resumen", "error");
        return true;
    }
}

async function cargarUsuarios() {

    try {

        const res =
            await fetch(
                `${API}/Admin/usuarios?t=${Date.now()}`
            );

        if (!res.ok) throw new Error();

        const lista =
            await res.json();

        usuariosCache = lista;
        renderUsuarios(lista);

    } catch {

        usuariosCache = [];

        textoHTML(
            "tablaUsuarios",
            `<tr><td colspan="7">Sin datos</td></tr>`
        );
    }
}

function renderUsuarios(lista) {

    textoHTML(
        "tablaUsuarios",
        lista.map(x => `
<tr>
<td>${escapeHtml(x.nombre)}</td>
<td>${escapeHtml(x.email || "-")}</td>
<td><span class="role-chip">${escapeHtml(x.rol || "-")}</span></td>
<td>
<span class="${x.activo ? "status-chip active" : "status-chip inactive"}">
${x.activo ? "Activo" : "Inactivo"}
</span>
</td>
<td>
${Number(x.registros || 0)} registros<br>
${Number(x.phq9 || 0) + Number(x.estres || 0)} evaluaciones<br>
${Number(x.alertas || 0)} alertas
</td>
<td>${fecha(x.fechaRegistro)}</td>
<td>
<div class="user-actions">
${x.activo && String(x.rol || "").toLowerCase() === "usuario" ? `
<button class="btn-secondary"
        onclick="promoverAdministrador(${x.id}, this)">
Convertir en administrador
</button>` : ""}
<button class="${x.activo ? "btn-secondary" : "nuevo-btn"}"
        onclick="cambiarEstadoUsuario(${x.id}, ${!x.activo}, this)">
${x.activo ? "Desactivar" : "Activar"}
</button>
</div>
</td>
</tr>`).join("") ||
        `<tr><td colspan="7">Sin datos con los filtros actuales</td></tr>`
    );
}

function aplicarFiltrosUsuarios() {

    const textoFiltro =
        normalizarTexto(valor("filtroUsuariosTexto"));

    const rol =
        valor("filtroUsuariosRol");

    const estado =
        valor("filtroUsuariosEstado");

    const filtrados =
        usuariosCache.filter(x => {
            const coincideTexto =
                !textoFiltro ||
                normalizarTexto(
                    `${x.nombre || ""} ${x.email || ""} ${x.zona || ""}`
                ).includes(textoFiltro);

            const coincideRol =
                !rol || x.rol === rol;

            const coincideEstado =
                !estado ||
                (estado === "activo" && x.activo) ||
                (estado === "inactivo" && !x.activo);

            return coincideTexto && coincideRol && coincideEstado;
        });

    renderUsuarios(filtrados);
}

function limpiarFiltrosUsuarios() {

    const textoFiltro =
        document.getElementById("filtroUsuariosTexto");

    const rol =
        document.getElementById("filtroUsuariosRol");

    const estado =
        document.getElementById("filtroUsuariosEstado");

    if (textoFiltro)
        textoFiltro.value = "";

    if (rol)
        rol.value = "";

    if (estado)
        estado.value = "";

    renderUsuarios(usuariosCache);
}

async function cargarPsicologos() {

    try {

        const res =
            await fetch(`${API}/Admin/psicologos?t=${Date.now()}`);

        if (!res.ok) throw new Error();

        const lista =
            await res.json();

        textoHTML(
            "tablaPsicologos",
            lista.map(x => `
<tr>
<td>${escapeHtml(x.nombre)}</td>
<td>${escapeHtml(x.zona || "-")}</td>
<td>${escapeHtml(x.especialidad || "-")}</td>
<td>
<button class="${x.activo ? "btn-secondary" : "nuevo-btn"}"
        onclick="cambiarEstadoUsuario(${x.id}, ${!x.activo}, this)">
${x.activo ? "Desactivar" : "Activar"}
</button>
</td>
</tr>`).join("") ||
            `<tr><td colspan="4">Sin datos</td></tr>`
        );

    } catch {

        textoHTML(
            "tablaPsicologos",
            `<tr><td colspan="4">Sin datos</td></tr>`
        );
    }
}

async function cargarVerificacionesProfesionales() {
    try {
        const res = await fetch(
            `${API}/psicologos-profesionales/admin/pendientes?t=${Date.now()}`
        );

        if (!res.ok)
            throw new Error(await res.text());

        const perfiles = await res.json();
        const tabla = document.getElementById("tablaVerificaciones");

        if (!tabla)
            return;

        tabla.innerHTML = perfiles.map(perfil => {
            const documento = (perfil.documentos || [])[0];
            const estado = escapeHtml(perfil.estadoVerificacion || "Pendiente");
            const acciones = documento
                ? `<button class="btn-secondary" onclick="verDocumentoProfesional(${perfil.id}, ${documento.id})">Ver documento</button>`
                : `<span class="status-chip inactive">Sin documento</span>`;

            return `
<tr>
    <td><strong>${escapeHtml(perfil.nombre)}</strong><br><small>${escapeHtml(perfil.email)}</small></td>
    <td>${escapeHtml(perfil.numeroCedula)}</td>
    <td>${acciones}</td>
    <td><span class="role-chip">${estado}</span></td>
    <td class="verification-actions">
        <button class="nuevo-btn" onclick="actualizarVerificacionProfesional(${perfil.id}, 'Verificado')">Aprobar</button>
        <button class="btn-secondary" onclick="actualizarVerificacionProfesional(${perfil.id}, 'CorreccionRequerida')">Solicitar corrección</button>
        <button class="btn-danger" onclick="actualizarVerificacionProfesional(${perfil.id}, 'Rechazado')">Rechazar</button>
    </td>
</tr>`;
        }).join("") ||
            `<tr><td colspan="5">No hay perfiles profesionales pendientes.</td></tr>`;
    } catch (error) {
        textoHTML(
            "tablaVerificaciones",
            `<tr><td colspan="5">No se pudo cargar la verificación profesional.</td></tr>`
        );
        console.error(error);
    }
}

async function verDocumentoProfesional(perfilId, documentoId) {
    try {
        const res = await fetch(
            `${API}/psicologos-profesionales/admin/${perfilId}/documentos/${documentoId}/url`,
            { method: "POST" }
        );

        const texto = await res.text();
        if (!res.ok)
            throw new Error(extraerMensaje(texto));

        const data = JSON.parse(texto);
        window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
        toast(error.message || "No se pudo abrir el documento", "error");
    }
}

async function actualizarVerificacionProfesional(perfilId, estado) {
    const observacion = window.prompt(
        estado === "Verificado"
            ? "Observación de aprobación (opcional):"
            : "Indica el motivo para el profesional:"
    );

    if (observacion === null)
        return;

    try {
        const res = await fetch(
            `${API}/psicologos-profesionales/admin/${perfilId}/verificacion`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado, observacion })
            }
        );

        const texto = await res.text();
        if (!res.ok)
            throw new Error(extraerMensaje(texto));

        toast("Estado profesional actualizado");
        await Promise.all([
            cargarVerificacionesProfesionales(),
            cargarUsuarios(),
            cargarPsicologos(),
            cargarResumen()
        ]);
    } catch (error) {
        toast(error.message || "No se pudo actualizar el estado", "error");
    }
}

async function cargarCitas() {

    try {

        const res =
            await fetch(`${API}/Admin/citas-proximas?t=${Date.now()}`);

        if (!res.ok) throw new Error();

        const lista =
            await res.json();

        textoHTML(
            "tablaCitas",
            lista.map(x => `
<tr>
<td>${fecha(x.fecha)}</td>
<td>${escapeHtml(x.paciente || "-")}</td>
<td>${escapeHtml(x.psicologo || "-")}</td>
<td>${escapeHtml(x.estado || "-")}</td>
</tr>`).join("") ||
            `<tr><td colspan="4">Sin citas próximas</td></tr>`
        );

    } catch {

        textoHTML(
            "tablaCitas",
            `<tr><td colspan="4">Sin datos</td></tr>`
        );
    }
}

async function cargarAlertas() {

    try {

        const res =
            await fetch(`${API}/IA/admin/alertas?t=${Date.now()}`);

        if (!res.ok) throw new Error();

        const lista =
            await res.json();

        const ordenada =
            lista.sort((a, b) =>
                Number(b.analisis?.score || 0) -
                Number(a.analisis?.score || 0)
            );

        renderCentroInstitucional(ordenada);
        renderWorkbenchAdmin(ordenada);
        renderAnaliticaAdmin(ordenada);

        textoHTML(
            "tablaAlertas",
            ordenada.slice(0, 12).map(x => `
<tr>
<td>
<strong>${escapeHtml(x.nombre || ("Usuario " + x.usuarioId))}</strong><br>
<small>${escapeHtml(x.email || x.zona || "-")}</small>
</td>
<td>
<span class="${claseRiesgo(x.analisis?.nivel)}">
${escapeHtml(x.analisis?.nivel || "-")}
</span>
</td>
<td>
<div class="score-mini">
<span>${Number(x.analisis?.score || 0)}</span>
<div><i style="width:${Math.min(100, Number(x.analisis?.score || 0))}%"></i></div>
</div>
</td>
<td>${Number(x.analisis?.confianza || 0)}%</td>
<td>${escapeHtml(x.analisis?.semaforo?.accion || x.analisis?.prioridad || "-")}</td>
<td>
<button class="btn-secondary" onclick="abrirExpediente(${x.usuarioId})">
Ver
</button>
</td>
</tr>`).join("") ||
            `<tr><td colspan="6">Sin alertas</td></tr>`
        );

    } catch {

        renderWorkbenchAdmin([]);
        renderCentroInstitucional([]);
        renderAnaliticaAdmin([]);

        textoHTML(
            "tablaAlertas",
            `<tr><td colspan="6">Sin datos</td></tr>`
        );
    }
}

function renderAnaliticaAdmin(lista) {

    const resumenRiesgo =
        contarRiesgoAdmin(lista);

    const resumenTendencia =
        contarTendenciaAdmin(lista);

    const dimensiones =
        promediarDimensionesAdmin(lista);

    const evaluables =
        lista.filter(x => Number(x.analisis?.confianza || 0) > 0).length;

    const cobertura =
        lista.length
            ? Math.round((evaluables / lista.length) * 100)
            : 0;

    const altaPrioridad =
        resumenRiesgo.critico + resumenRiesgo.alto;

    texto("adminCoberturaIA", `${cobertura}%`);
    texto("adminEvaluables", evaluables);
    texto("adminAltaPrioridad", altaPrioridad);
    texto("adminGobernanza", gobernanzaSugerida(altaPrioridad, resumenRiesgo.medio, resumenRiesgo.sinDatos));
    texto("adminInsightRiesgo", insightRiesgoAdmin(resumenRiesgo, lista.length));
    texto("adminInsightTendencia", insightTendenciaAdmin(resumenTendencia));

    renderFallbackAdmin(
        resumenRiesgo,
        resumenTendencia,
        dimensiones
    );

    if (typeof Chart === "undefined") {
        document
            .querySelector(".admin-analytics")
            ?.classList.add("chart-offline");
        document
            .querySelector(".admin-analytics")
            ?.classList.remove("charts-ready");
        return;
    }

    document
        .querySelector(".admin-analytics")
        ?.classList.remove("chart-offline");

    renderGraficaRiesgoAdmin(resumenRiesgo);
    renderGraficaTendenciaAdmin(resumenTendencia);
    renderGraficaDimensionesAdmin(dimensiones);

    document
        .querySelector(".admin-analytics")
        ?.classList.add("charts-ready");
}

function renderGraficaRiesgoAdmin(resumen) {

    const canvas =
        document.getElementById("graficaRiesgoAdmin");

    if (!canvas)
        return;

    if (graficaRiesgoAdmin)
        graficaRiesgoAdmin.destroy();

    graficaRiesgoAdmin =
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

function renderGraficaTendenciaAdmin(resumen) {

    const canvas =
        document.getElementById("graficaTendenciaAdmin");

    if (!canvas)
        return;

    if (graficaTendenciaAdmin)
        graficaTendenciaAdmin.destroy();

    graficaTendenciaAdmin =
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
                    label: "Usuarios",
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

function renderGraficaDimensionesAdmin(dimensiones) {

    const canvas =
        document.getElementById("graficaDimensionesAdmin");

    if (!canvas)
        return;

    if (graficaDimensionesAdmin)
        graficaDimensionesAdmin.destroy();

    graficaDimensionesAdmin =
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
                    label: "Promedio institucional",
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

function renderFallbackAdmin(
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

    textoHTML(
        "fallbackRiesgoAdmin",
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

    textoHTML(
        "fallbackTendenciaAdmin",
        [
            filaFallback("Mejora", resumenTendencia.mejora, totalTendencia, "low"),
            filaFallback("Estable", resumenTendencia.estable, totalTendencia, ""),
            filaFallback("Deterioro", resumenTendencia.deterioro, totalTendencia, "high"),
            filaFallback("Insuficiente", resumenTendencia.insuficiente, totalTendencia, "neutral")
        ].join("")
    );

    textoHTML(
        "fallbackDimensionesAdmin",
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

function contarRiesgoAdmin(lista) {

    const resumen = {
        critico: 0,
        alto: 0,
        medio: 0,
        bajo: 0,
        sinDatos: 0
    };

    lista.forEach(x => {
        const nivel =
            normalizarTexto(x.analisis?.nivel || "");

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

function contarTendenciaAdmin(lista) {

    const resumen = {
        mejora: 0,
        estable: 0,
        deterioro: 0,
        insuficiente: 0
    };

    lista.forEach(x => {
        const tendencia =
            normalizarTexto(x.analisis?.tendencia || "");

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

function promediarDimensionesAdmin(lista) {

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
                lista.map(x =>
                    Number(x.analisis?.dimensiones?.[llave] || 0)
                )
            );
    });

    return resultado;
}

function insightRiesgoAdmin(resumen, total) {

    const alta =
        resumen.critico + resumen.alto;

    if (!total)
        return "Sin usuarios activos para priorización institucional.";

    if (alta > 0)
        return `${alta} de ${total} usuarios requieren revisión prioritaria.`;

    if (resumen.medio > 0)
        return `${resumen.medio} usuarios requieren seguimiento cercano.`;

    if (resumen.sinDatos === total)
        return "La población requiere completar registros y evaluaciones.";

    return "La población se mantiene en monitoreo preventivo.";
}

function insightTendenciaAdmin(resumen) {

    if (resumen.deterioro > 0)
        return `${resumen.deterioro} usuarios muestran deterioro reciente.`;

    if (resumen.mejora > 0)
        return `${resumen.mejora} usuarios muestran mejora emocional.`;

    if (resumen.estable > 0)
        return "Predomina una tendencia estable.";

    return "Se necesitan más registros para calcular tendencia.";
}

function gobernanzaSugerida(alta, medio, sinDatos) {

    if (alta > 0)
        return "Priorizar seguimiento";

    if (medio > 0)
        return "Revisión semanal";

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

function renderWorkbenchAdmin(lista) {

    const contenedor =
        document.getElementById("adminAlertCards");

    if (!contenedor)
        return;

    if (!lista.length) {
        contenedor.innerHTML = `
            <div class="empty-state">
                No hay usuarios activos con datos suficientes para priorización.
            </div>`;

        texto("adminPromedioIA", "0");
        texto("adminSeguimientoCercano", "0");
        texto("adminSinDatos", "0");
        texto("adminConfianzaPromedio", "0%");
        texto("adminActualizacionIA", "Sin alertas");
        return;
    }

    const scores =
        lista.map(x => Number(x.analisis?.score || 0));

    const confianzas =
        lista.map(x => Number(x.analisis?.confianza || 0));

    const promedioScore =
        Math.round(
            scores.reduce((total, actual) => total + actual, 0) /
            scores.length
        );

    const promedioConfianza =
        Math.round(
            confianzas.reduce((total, actual) => total + actual, 0) /
            confianzas.length
        );

    const seguimiento =
        lista.filter(x => {
            const nivel =
                String(x.analisis?.nivel || "").toLowerCase();

            return (
                Number(x.analisis?.score || 0) >= 35 ||
                nivel.includes("medio") ||
                nivel.includes("alto") ||
                nivel.includes("critico") ||
                nivel.includes("crítico")
            );
        }).length;

    const sinDatos =
        lista.filter(x =>
            Number(x.analisis?.score || 0) === 0 ||
            String(x.analisis?.nivel || "").toLowerCase().includes("sin datos")
        ).length;

    texto("adminPromedioIA", promedioScore);
    texto("adminSeguimientoCercano", seguimiento);
    texto("adminSinDatos", sinDatos);
    texto("adminConfianzaPromedio", `${promedioConfianza}%`);
    texto(
        "adminActualizacionIA",
        `Actualizado ${new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit"
        })}`
    );

    contenedor.innerHTML =
        lista.slice(0, 4).map(x => tarjetaAlertaAdmin(x)).join("");
}

function tarjetaAlertaAdmin(item) {

    const analisis =
        item.analisis || {};

    const score =
        Number(analisis.score || 0);

    const nivel =
        analisis.nivel || "Sin datos";

    const accion =
        analisis.accionPrioritaria?.detalle ||
        analisis.semaforo?.accion ||
        analisis.prioridad ||
        "Revisar expediente clínico";

    return `
        <article class="admin-alert-card">
            <div class="alert-card-top">
                <div>
                    <span class="${claseRiesgo(nivel)}">${escapeHtml(nivel)}</span>
                    <h3>${escapeHtml(item.nombre || ("Usuario " + item.usuarioId))}</h3>
                    <p>${escapeHtml(item.email || item.zona || "Sin dato de contacto")}</p>
                </div>
                <div class="mini-score ${claseScore(score)}">
                    <strong>${score}</strong>
                    <span>IA</span>
                </div>
            </div>

            <div class="alert-card-metrics">
                <div>
                    <span>Confianza</span>
                    <strong>${Number(analisis.confianza || 0)}%</strong>
                </div>
                <div>
                    <span>Tendencia</span>
                    <strong>${escapeHtml(analisis.tendencia || "-")}</strong>
                </div>
                <div>
                    <span>Calidad señal</span>
                    <strong>${escapeHtml(analisis.calidadDatos?.nivel || "-")}</strong>
                </div>
                <div>
                    <span>Volatilidad</span>
                    <strong>${escapeHtml(analisis.volatilidad?.nivel || "-")}</strong>
                </div>
                <div>
                    <span>Perfil IA</span>
                    <strong>${escapeHtml(analisis.perfilClinico?.tipo || "-")}</strong>
                </div>
                <div>
                    <span>Trayectoria</span>
                    <strong>${escapeHtml(analisis.trayectoriaRiesgo?.estado || "-")}</strong>
                </div>
                <div>
                    <span>Decisión</span>
                    <strong>${escapeHtml(analisis.decisionClinica?.nivelDecision || "-")}</strong>
                </div>
                <div>
                    <span>Intervención</span>
                    <strong>${escapeHtml(analisis.matrizIntervencion?.nivel || "-")}</strong>
                </div>
            </div>

            <p class="alert-action">${escapeHtml(accion)}</p>

            <button class="btn-secondary" onclick="abrirExpediente(${item.usuarioId})">
                <i class="fa-solid fa-folder-open"></i>
                Ver expediente
            </button>
        </article>`;
}

function renderCentroInstitucional(lista) {

    const prioritario =
        lista[0];

    if (!prioritario) {
        texto("adminPacientePrioritario", "Sin alertas priorizadas");
        texto("adminAccionPrioritaria", "No hay pacientes activos con datos suficientes.");
        texto("adminScoreMaximo", "0");
        texto("adminAlto", "0");
        texto("adminMedio", "0");
        texto("adminBajo", "0");
        return;
    }

    texto("adminPacientePrioritario", prioritario.nombre || "Paciente");
    texto(
        "adminAccionPrioritaria",
        prioritario.analisis?.accionPrioritaria?.detalle ||
        prioritario.analisis?.semaforo?.accion ||
        prioritario.analisis?.prioridad ||
        "Revisar expediente clínico"
    );
    texto("adminScoreMaximo", Number(prioritario.analisis?.score || 0));

    let alto = 0;
    let medio = 0;
    let bajo = 0;

    lista.forEach(x => {
        const nivel =
            String(x.analisis?.nivel || "").toLowerCase();

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

    texto("adminAlto", alto);
    texto("adminMedio", medio);
    texto("adminBajo", bajo);
}

async function cargarConsentimientos() {

    try {

        const res =
            await fetch(
                `${API}/Admin/consentimientos-recientes?t=${Date.now()}`
            );

        if (!res.ok) throw new Error();

        const lista =
            await res.json();

        textoHTML(
            "tablaConsentimientos",
            lista.map(x => `
<tr>
<td>${escapeHtml(x.usuario || ("Usuario " + x.usuarioId))}</td>
<td>${escapeHtml(x.versionDocumento || "-")}</td>
<td>${fecha(x.fechaAceptacion)}</td>
</tr>`).join("") ||
            `<tr><td colspan="3">Sin consentimientos</td></tr>`
        );

    } catch {

        textoHTML(
            "tablaConsentimientos",
            `<tr><td colspan="3">Sin datos</td></tr>`
        );
    }
}

function abrirModalPsicologo() {

    document.getElementById("modalPsicologo")
        .style.display = "flex";
}

function cerrarModalPsicologo() {

    document.getElementById("modalPsicologo")
        .style.display = "none";
}

async function guardarPsicologo() {

    const body = {
        nombre: valor("nombrePsico"),
        apellidoPaterno: valor("apellidoPaternoPsico"),
        apellidoMaterno: valor("apellidoMaternoPsico"),
        email: valor("correoPsico"),
        password: valor("passPsico"),
        telefono: valor("telPsico"),
        zona: valor("zonaPsico"),
        numeroCedula: valor("cedulaPsico"),
        institucion: valor("institucionPsico"),
        especialidad: valor("espPsico"),
        aniosExperiencia: valor("experienciaPsico")
            ? Number(valor("experienciaPsico"))
            : null,
        aceptaTerminos: document.getElementById("aceptaPsico")?.checked === true
    };

    if (!body.nombre || !body.apellidoPaterno || !body.apellidoMaterno ||
        !body.email || !body.password || !body.telefono || !body.zona ||
        !body.numeroCedula || !body.institucion || !body.especialidad ||
        !body.aceptaTerminos) {
        toast("Completa los datos profesionales obligatorios", "error");
        return;
    }

    if (!/^\S+@\S+\.\S+$/.test(body.email)) {
        toast("Ingresa un correo electrónico válido", "error");
        return;
    }

    if (body.password.length < 10) {
        toast("La contraseña debe tener al menos 10 caracteres", "error");
        return;
    }

    const boton = document.querySelector(
        "#modalPsicologo button:not(.cancelar)"
    );

    if (boton?.disabled)
        return;

    const etiquetaOriginal = boton?.innerHTML || "Guardar";

    if (boton) {
        boton.disabled = true;
        boton.setAttribute("aria-busy", "true");
        boton.innerText = "Guardando...";
    }

    try {

        const res =
            await fetch(
                `${API}/psicologos-profesionales/registro`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                }
            );

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(extraerMensaje(txt));

        toast("Perfil profesional creado. Falta cargar y verificar la cédula.");
        cerrarModalPsicologo();
        limpiarFormularioPsicologo();
        await iniciar();

    } catch (error) {

        toast(error.message || "No se pudo crear", "error");
    } finally {

        if (boton) {
            boton.disabled = false;
            boton.removeAttribute("aria-busy");
            boton.innerHTML = etiquetaOriginal;
        }
    }
}

async function desactivarPsicologo(id, nombre) {

    if (!confirm(`¿Desactivar a ${nombre}? Sus citas, notas e historial se conservaran.`))
        return;

    try {

        const res =
            await fetch(
                `${API}/Admin/eliminar-psicologo/${id}`,
                { method: "DELETE" }
            );

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(extraerMensaje(txt));

        toast(limpiar(txt));
        await iniciar();

    } catch (error) {

        toast(error.message || "No se pudo desactivar", "error");
    }
}

async function cambiarEstadoUsuario(id, activo, boton) {

    const accion =
        activo ? "activar" : "desactivar";

    if (!confirm(`¿Deseas ${accion} este usuario?`))
        return;

    if (boton?.disabled)
        return;

    const etiquetaOriginal = boton?.innerHTML || "";

    if (boton) {
        boton.disabled = true;
        boton.setAttribute("aria-busy", "true");
        boton.innerText = "Actualizando...";
    }

    try {

        const res =
            await fetch(
                `${API}/Admin/usuarios/${id}/estado`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ activo })
                }
            );

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(extraerMensaje(txt));

        toast(extraerMensaje(txt));
        await iniciar();

    } catch (error) {

        toast(error.message || "No se pudo actualizar", "error");
    } finally {

        if (boton) {
            boton.disabled = false;
            boton.removeAttribute("aria-busy");
            boton.innerHTML = etiquetaOriginal;
        }
    }
}

async function promoverAdministrador(id, boton) {

    const usuario = usuariosCache.find(x => Number(x.id) === Number(id));
    const nombre = usuario?.nombre || "esta cuenta";

    if (!confirm(`¿Convertir a ${nombre} en administrador? Esta acción quedará registrada.`))
        return;

    if (boton?.disabled)
        return;

    const etiquetaOriginal = boton?.innerHTML || "";

    if (boton) {
        boton.disabled = true;
        boton.setAttribute("aria-busy", "true");
        boton.innerText = "Asignando...";
    }

    try {

        const res = await fetch(
            `${API}/Admin/usuarios/${id}/promover-administrador`,
            { method: "PATCH" }
        );

        const txt = await res.text();

        if (!res.ok)
            throw new Error(extraerMensaje(txt));

        toast(extraerMensaje(txt));
        await iniciar();

    } catch (error) {

        toast(error.message || "No se pudieron asignar los permisos", "error");
    } finally {

        if (boton) {
            boton.disabled = false;
            boton.removeAttribute("aria-busy");
            boton.innerHTML = etiquetaOriginal;
        }
    }
}

function limpiarFormularioPsicologo() {

    [
        "nombrePsico",
        "apellidoPaternoPsico",
        "apellidoMaternoPsico",
        "correoPsico",
        "passPsico",
        "telPsico",
        "zonaPsico",
        "cedulaPsico",
        "institucionPsico",
        "espPsico"
    ].forEach(id => {
        const input = document.getElementById(id);

        if (input)
            input.value = "";
    });

    const experiencia = document.getElementById("experienciaPsico");
    const acepta = document.getElementById("aceptaPsico");
    if (experiencia)
        experiencia.value = "";
    if (acepta)
        acepta.checked = false;
}

function crearGrafica() {

    const canvas =
        document.getElementById("graficaAdmin");

    if (!canvas || typeof Chart === "undefined")
        return;

    if (grafica)
        grafica.destroy();

    Chart.defaults.font.family = "'Segoe UI', sans-serif";
    Chart.defaults.color = "#64748b";
    Chart.defaults.plugins.tooltip.backgroundColor = "#172033";
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;

    grafica = new Chart(canvas, {
        type: "bar",
        data: {
            labels: [
                "Usuarios",
                "Psicólogos",
                "Citas",
                "Tests",
                "Registros"
            ],
            datasets: [{
                data: [
                    numero("usuarios"),
                    numero("psicologos"),
                    numero("citas"),
                    numero("tests"),
                    numero("registros")
                ],
                backgroundColor: [
                    "#1f5eff",
                    "#14b8a6",
                    "#059669",
                    "#d97706",
                    "#334155"
                ],
                borderRadius: 8,
                barThickness: 26
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: "rgba(148, 163, 184, .22)"
                    },
                    ticks: {
                        precision: 0
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function logout() {

    localStorage.clear();
    location.href = "login.html";
}

function abrirExpediente(id) {
    window.open(`historialusuario.html?id=${id}`, "_blank");
}

function toast(msg, tipo = "ok") {

    const t =
        document.getElementById("toast");

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

function texto(id, valor) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText = valor;
}

function textoHTML(id, valor) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerHTML = valor;
}

function valor(id) {

    const el =
        document.getElementById(id);

    return el ? el.value.trim() : "";
}

function numero(id) {

    const el =
        document.getElementById(id);

    if (!el) return 0;

    return parseInt(el.innerText) || 0;
}

function fecha(valor) {

    if (!valor) return "-";

    return new Date(valor).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function escapeHtml(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function claseRiesgo(valor) {

    const texto =
        String(valor || "").toLowerCase();

    if (
        texto.includes("alto") ||
        texto.includes("severo") ||
        texto.includes("critico") ||
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

function claseScore(score) {

    if (score >= 70)
        return "high";

    if (score >= 35)
        return "medium";

    return "low";
}

function extraerMensaje(texto) {

    try {
        const data = JSON.parse(texto);
        return data.mensaje || data.title || texto;
    } catch {
        return limpiar(texto);
    }
}

function limpiar(texto) {

    return String(texto || "")
        .replaceAll('"', "")
        .trim();
}

function normalizarTexto(texto) {

    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
