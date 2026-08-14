const API = window.MINDCARE_API_BASE;

const params =
    new URLSearchParams(window.location.search);

const usuarioId =
    Number(params.get("id") || localStorage.getItem("usuarioId"));

let expedienteActual = null;

window.addEventListener("load", iniciar);

async function iniciar() {

    if (!localStorage.getItem("token")) {
        location.href = "login.html";
        return;
    }

    if (!usuarioId) {
        mostrarErrorGeneral("No se recibió el identificador del usuario.");
        return;
    }

    await cargarExpediente();
}

async function cargarExpediente() {

    try {

        const expediente =
            await pedirJson(`${API}/ExpedienteClinico/${usuarioId}`);

        expedienteActual = expediente;

        renderUsuario(expediente.usuario);
        renderResumenExpediente(expediente.resumen);
        renderRegistros(expediente.registros || []);
        renderPHQ9(expediente.phq9 || []);
        renderEstres(expediente.estresLaboral || []);
        renderCitas(expediente.citas || []);
        renderNotas(expediente.notas || []);
        renderIA(expediente.ia);

        if (params.get("autopdf") === "1") {
            setTimeout(() => {
                generarPDFClinico();
            }, 500);
        }

    } catch (error) {

        mostrarErrorGeneral(error.message);
    }
}

function renderResumenExpediente(resumen) {

    texto("totalRegistros", resumen?.totalRegistros || 0);
    texto("totalTests", resumen?.totalEvaluaciones || 0);
    texto("ultimoPHQ", resumen?.ultimoPHQ9 ?? "-");
    texto("ultimoAnimo", resumen?.ultimoAnimo ?? "-");
    texto("ultimoEstres", resumen?.ultimoEstres ?? "-");
}

function renderUsuario(usuario) {

    if (!usuario)
        return;

    texto(
        "tituloPaciente",
        usuario.nombre || "Historial clínico emocional"
    );
}

async function pedirJson(url) {

    const res =
        await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`);

    const texto =
        await res.text();

    if (!res.ok)
        throw new Error(extraerMensaje(texto));

    return texto ? JSON.parse(texto) : null;
}

function renderResumen(registros, phq9, estres) {

    const totalEvaluaciones =
        (phq9?.length || 0) +
        (estres?.length || 0);

    texto("totalRegistros", registros?.length || 0);
    texto("totalTests", totalEvaluaciones);
    texto("ultimoPHQ", phq9?.[0]?.puntaje ?? "-");
    texto("ultimoAnimo", registros?.[0]?.nivelAnimo ?? "-");
    texto("ultimoEstres", registros?.[0]?.nivelEstres ?? "-");
}

function renderRegistros(lista) {

    const contenedor =
        document.getElementById("registros");

    if (!contenedor)
        return;

    if (!lista?.length) {
        contenedor.innerHTML =
            `<div class="empty">Sin registros emocionales.</div>`;
        return;
    }

    contenedor.innerHTML =
        lista.map(x => `
            <div class="timeline-item">
                <div class="date">${fecha(x.fecha)}</div>
                <strong>Ánimo ${x.nivelAnimo}/10 · Estrés ${x.nivelEstres}/10</strong>
                <span>${escapeHtml(x.categoria || "General")}</span>
                <p>${escapeHtml(x.nota || "Sin nota")}</p>
            </div>
        `).join("");
}

function renderPHQ9(lista) {

    const contenedor =
        document.getElementById("tests");

    if (!contenedor)
        return;

    if (!lista?.length) {
        contenedor.innerHTML =
            `<div class="empty">Sin evaluaciones PHQ-9.</div>`;
        return;
    }

    contenedor.innerHTML =
        lista.map(x => `
            <div class="timeline-item">
                <div class="date">${fecha(x.fecha)}</div>
                <strong>PHQ-9 · ${x.puntaje} puntos</strong>
                <span>${escapeHtml(x.nivel || "-")}</span>
            </div>
        `).join("");
}

function renderEstres(lista) {

    const contenedor =
        document.getElementById("estresLaboral");

    if (!contenedor)
        return;

    if (!lista?.length) {
        contenedor.innerHTML =
            `<div class="empty">Sin evaluación de test de estrés.</div>`;
        return;
    }

    contenedor.innerHTML =
        lista.map(x => `
            <div class="timeline-item">
                <div class="date">${fecha(x.fecha)}</div>
                <strong>Test de estrés · ${x.puntaje} puntos</strong>
                <span>${escapeHtml(x.nivel || "-")}</span>
            </div>
        `).join("");
}

function renderCitas(lista) {

    const contenedor =
        document.getElementById("citas");

    if (!contenedor)
        return;

    if (!lista?.length) {
        contenedor.innerHTML =
            `<div class="empty">Sin citas registradas.</div>`;
        return;
    }

    contenedor.innerHTML =
        lista.map(x => `
            <div class="timeline-item">
                <div class="date">${fecha(x.fecha)}</div>
                <strong>${escapeHtml(x.estado || "Pendiente")}</strong>
                <span>${escapeHtml(x.observacion || "Sin observaciones")}</span>
            </div>
        `).join("");
}

function renderNotas(lista) {

    const contenedor =
        document.getElementById("notasClinicas");

    if (!contenedor)
        return;

    if (!lista?.length) {
        contenedor.innerHTML =
            `<div class="empty">Sin notas clínicas registradas.</div>`;
        return;
    }

    contenedor.innerHTML =
        lista.map(x => `
            <div class="clinical-item">
                <strong>${fecha(x.fecha)} · ${escapeHtml(x.psicologo || "Psicólogo")}</strong>
                <span>${escapeHtml(x.nota || "Sin nota")}</span>
                <em>${escapeHtml(x.planAccion || "Sin plan de acción")}</em>
            </div>
        `).join("");
}

function renderIA(ia) {

    texto("iaScore", ia?.score ?? 0);
    texto("iaConfianza", `${ia?.confianza ?? 0}%`);
    texto("iaPrioridad", ia?.prioridad || "-");
    texto("iaTendencia", ia?.tendencia || "-");
    texto("iaMensaje", ia?.mensaje || "Sin análisis disponible.");
    texto("iaMetodo", ia?.metodologia || "Motor local basado en reglas.");

    const nivel =
        document.getElementById("iaNivel");

    if (nivel) {
        nivel.className =
            `risk-chip ${String(ia?.nivel || "").toLowerCase()}`;
        nivel.innerText =
            ia?.semaforo?.etiqueta ||
            ia?.nivel ||
            "Sin datos";
    }

    renderFactores(ia?.factores || []);
    renderRecomendaciones(ia?.recomendaciones || []);
    renderIAAvanzadaExpediente(ia || {});
}

function renderIAAvanzadaExpediente(ia) {

    const decision =
        ia.decisionClinica || {};

    const bienestar =
        ia.indiceBienestar || {};

    const perfil =
        ia.perfilClinico || {};

    const trayectoria =
        ia.trayectoriaRiesgo || {};

    const matriz =
        ia.matrizIntervencion || {};

    texto("iaDecisionNivel", decision.nivelDecision || "Captura inicial");
    texto(
        "iaDecisionResumen",
        decision.resumen ||
        "Se requiere información clínica y emocional para construir una lectura orientativa."
    );
    texto(
        "iaDecisionRazon",
        decision.razon ||
        "MindCare prioriza señales; no sustituye diagnóstico profesional."
    );

    texto("iaBienestar", bienestar.puntaje ?? 0);
    texto("iaBienestarNivel", bienestar.nivel || "Sin datos");
    texto("iaPerfil", perfil.tipo || "Sin perfil");
    texto("iaPerfilDetalle", perfil.descripcion || perfil.foco || "Sin datos suficientes.");
    texto("iaTrayectoria", trayectoria.estado || "Sin datos");
    texto(
        "iaTrayectoriaDetalle",
        trayectoria.interpretacion ||
        "Se requiere historial emocional."
    );

    texto("iaIntervencion", matriz.nivel || "Inicial");
    texto(
        "iaIntervencionDetalle",
        matriz.objetivo ||
        matriz.intervencion ||
        "Construir línea base."
    );

    renderPreguntasIA(ia.preguntasSeguimiento || []);
}

function renderPreguntasIA(lista) {

    const contenedor =
        document.getElementById("preguntasIA");

    if (!contenedor)
        return;

    if (!lista.length) {
        contenedor.innerHTML =
            `<div class="empty">Completa datos para generar preguntas de seguimiento.</div>`;
        return;
    }

    contenedor.innerHTML =
        lista.slice(0, 5).map((x, i) => `
            <div class="clinical-item question">
                <strong>Pregunta ${i + 1}</strong>
                <span>${escapeHtml(x)}</span>
            </div>
        `).join("");
}

function renderFactores(lista) {

    const contenedor =
        document.getElementById("factoresIA");

    if (!contenedor)
        return;

    if (!lista.length) {
        contenedor.innerHTML =
            `<div class="empty">Sin factores de riesgo activos.</div>`;
        return;
    }

    contenedor.innerHTML =
        lista.map(x => `
            <div class="clinical-item">
                <strong>${escapeHtml(x.fuente || "Factor")}</strong>
                <span>${escapeHtml(x.descripcion || "")}</span>
                <em>${escapeHtml(x.severidad || "-")} · Peso ${Number(x.peso || 0)}</em>
            </div>
        `).join("");
}

function renderRecomendaciones(lista) {

    const contenedor =
        document.getElementById("recomendacionesIA");

    if (!contenedor)
        return;

    if (!lista.length) {
        contenedor.innerHTML =
            `<div class="empty">Completa más datos para personalizar recomendaciones.</div>`;
        return;
    }

    contenedor.innerHTML =
        lista.map((x, i) => `
            <div class="clinical-item">
                <strong>Acción ${i + 1}</strong>
                <span>${escapeHtml(x)}</span>
            </div>
        `).join("");
}

function mostrarErrorGeneral(mensaje) {

    [
        "registros",
        "tests",
        "estresLaboral",
        "citas",
        "factoresIA",
        "recomendacionesIA",
        "notasClinicas"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el)
            el.innerHTML =
                `<div class="empty">${escapeHtml(mensaje || "No se pudo cargar.")}</div>`;
    });
}

function volver() {

    if (history.length > 1) {
        history.back();
        return;
    }

    const rol =
        (localStorage.getItem("rol") || "").toLowerCase();

    if (rol === "admin")
        location.href = "admin.html";
    else if (rol.includes("psic"))
        location.href = "psicologo/dashboardPsicologo.html";
    else
        location.href = "dashboard.html";
}

function imprimirExpediente() {

    if (!expedienteActual) {
        window.print();
        return;
    }

    const ventana =
        window.open("", "_blank");

    if (!ventana) {
        window.print();
        return;
    }

    ventana.document.open();
    ventana.document.write(
        crearHTMLImpresion(expedienteActual)
    );
    ventana.document.close();
    ventana.focus();

    setTimeout(() => {
        ventana.print();
    }, 350);
}

async function generarPDFClinico() {

    if (!window.jspdf) {
        await generarPDFClinicoNativo();
        return;
    }

    if (!expedienteActual)
        expedienteActual =
            await pedirJson(`${API}/ExpedienteClinico/${usuarioId}`);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const page = {
        width: 210,
        height: 297,
        left: 14,
        right: 196
    };

    let y = 14;

    const azul = [31, 94, 255];
    const oscuro = [23, 32, 51];
    const gris = [91, 107, 132];
    const claro = [244, 247, 251];
    const borde = [219, 227, 239];

    function checkPage(extra = 20) {
        if (y + extra <= 280)
            return;

        footer();
        doc.addPage();
        y = 16;
    }

    function footer() {
        doc.setDrawColor(...borde);
        doc.line(page.left, 286, page.right, 286);
        doc.setFontSize(8);
        doc.setTextColor(...gris);
        doc.text(
            "MindCare - Expediente de seguimiento. Uso clinico y confidencial.",
            page.left,
            292
        );
    }

    function agregarPaginacion() {
        const total = doc.getNumberOfPages();
        for (let pagina = 1; pagina <= total; pagina++) {
            doc.setPage(pagina);
            doc.setTextColor(...gris);
            doc.setFontSize(7.5);
            doc.text(
                `No sustituye diagnostico profesional | Pagina ${pagina} de ${total}`,
                page.right,
                292,
                { align: "right" }
            );
        }
    }

    function text(value) {
        return limpiarPDF(value);
    }

    function title(value) {
        checkPage(12);
        doc.setTextColor(...oscuro);
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text(text(value), page.left, y);
        y += 8;
        doc.setFont(undefined, "normal");
    }

    function paragraph(value, size = 10) {
        checkPage(12);
        doc.setTextColor(...gris);
        doc.setFontSize(size);
        const lines =
            doc.splitTextToSize(text(value), 176);
        doc.text(lines, page.left, y);
        y += lines.length * 5 + 3;
    }

    function row(label, value) {
        checkPage(9);
        doc.setTextColor(...gris);
        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        doc.text(text(label), page.left, y);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...oscuro);
        doc.text(text(value), 58, y);
        y += 6;
    }

    function card(label, value, x, width) {
        doc.setFillColor(...claro);
        doc.setDrawColor(...borde);
        doc.roundedRect(x, y, width, 22, 3, 3, "FD");
        doc.setTextColor(...gris);
        doc.setFontSize(8);
        doc.setFont(undefined, "bold");
        doc.text(text(label).toUpperCase(), x + 4, y + 7);
        doc.setTextColor(...oscuro);
        doc.setFontSize(15);
        doc.text(text(value), x + 4, y + 16);
        doc.setFont(undefined, "normal");
    }

    function bullet(value) {
        checkPage(10);
        doc.setTextColor(...oscuro);
        doc.setFontSize(9);
        const lines =
            doc.splitTextToSize("- " + text(value), 176);
        doc.text(lines, page.left, y);
        y += lines.length * 5 + 2;
    }

    function timelineItem(titleText, bodyText) {
        checkPage(22);
        doc.setFillColor(...claro);
        doc.setDrawColor(...borde);
        doc.roundedRect(page.left, y, 182, 20, 3, 3, "FD");
        doc.setTextColor(...oscuro);
        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        doc.text(text(titleText), page.left + 4, y + 7);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...gris);
        const lines =
            doc.splitTextToSize(text(bodyText), 172);
        doc.text(lines.slice(0, 2), page.left + 4, y + 14);
        y += 24;
    }

    const expediente = expedienteActual;
    const usuario = expediente.usuario || {};
    const resumen = expediente.resumen || {};
    const ia = expediente.ia || {};

    doc.setFillColor(...azul);
    doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, "bold");
    doc.text("MindCare", page.left, 16);
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text("Expediente de seguimiento psicologico", page.left, 25);
    doc.setFontSize(8);
    doc.text(text(new Date().toLocaleString("es-MX")), page.left, 32);
    doc.text("CONFIDENCIAL", page.right, 16, { align: "right" });

    y = 50;
    title("Datos del paciente");
    row("Nombre", usuario.nombre || "-");
    row("Correo", usuario.email || "-");
    row("Telefono", usuario.telefono || "-");
    row("Zona", usuario.zona || "-");
    row("Rol", usuario.rol || "-");

    y += 4;
    card("Registros", resumen.totalRegistros ?? 0, 14, 34);
    card("Evaluaciones", resumen.totalEvaluaciones ?? 0, 52, 38);
    card("PHQ-9", resumen.ultimoPHQ9 ?? "-", 94, 30);
    card("Animo", resumen.ultimoAnimo ?? "-", 128, 30);
    card("Estres", resumen.ultimoEstres ?? "-", 162, 34);
    y += 30;

    title("Analisis IA explicable");
    row("Nivel", ia.nivel || "-");
    row("Score", `${ia.score ?? 0}/100`);
    row("Confianza", `${ia.confianza ?? 0}%`);
    row("Prioridad", ia.prioridad || "-");
    row("Tendencia", ia.tendencia || "-");
    row("Decision IA", ia.decisionClinica?.nivelDecision || "-");
    row("Bienestar", `${ia.indiceBienestar?.puntaje ?? 0}/100`);
    row("Perfil", ia.perfilClinico?.tipo || "-");
    row("Trayectoria", ia.trayectoriaRiesgo?.estado || "-");
    row("Intervencion", ia.matrizIntervencion?.nivel || "-");
    paragraph(ia.mensaje || "Sin analisis disponible.");
    paragraph(ia.decisionClinica?.resumen || "", 8);
    paragraph(ia.matrizIntervencion?.objetivo || "", 8);
    paragraph(ia.matrizIntervencion?.intervencion || "", 8);
    paragraph(ia.metodologia || "Motor local basado en reglas ponderadas.", 8);

    title("Preguntas inteligentes de seguimiento");
    (ia.preguntasSeguimiento || []).slice(0, 5).forEach(bullet);
    if (!(ia.preguntasSeguimiento || []).length)
        bullet("Completar datos para generar preguntas de seguimiento.");

    title("Recomendaciones");
    (ia.recomendaciones || []).slice(0, 5).forEach(bullet);
    if (!(ia.recomendaciones || []).length)
        bullet("Completar registros y evaluaciones para personalizar recomendaciones.");

    title("Factores detectados");
    (ia.factores || []).slice(0, 6).forEach(f =>
        bullet(`${f.fuente || "Factor"}: ${f.descripcion || ""} (${f.severidad || "-"}, peso ${f.peso || 0})`)
    );
    if (!(ia.factores || []).length)
        bullet("Sin factores de riesgo activos con la informacion actual.");

    title("Ultimos registros emocionales");
    (expediente.registros || []).slice(0, 6).forEach(r =>
        timelineItem(
            `${fechaCorta(r.fecha)} - Animo ${r.nivelAnimo}/10, Estres ${r.nivelEstres}/10`,
            `${r.categoria || "General"}: ${r.nota || "Sin nota"}`
        )
    );
    if (!(expediente.registros || []).length)
        bullet("Sin registros emocionales.");

    title("Evaluaciones");
    (expediente.phq9 || []).slice(0, 4).forEach(t =>
        timelineItem(
            `${fechaCorta(t.fecha)} - PHQ-9 ${t.puntaje} pts`,
            t.nivel || "-"
        )
    );
    (expediente.estresLaboral || []).slice(0, 4).forEach(t =>
        timelineItem(
            `${fechaCorta(t.fecha)} - Test de estres ${t.puntaje} pts`,
            t.nivel || "-"
        )
    );

    title("Citas y notas clinicas");
    (expediente.citas || []).slice(0, 4).forEach(c =>
        timelineItem(
            `${fechaCorta(c.fecha)} - ${c.estado || "Pendiente"}`,
            `${c.psicologo || "Psicologo"}: ${c.observacion || "Sin observaciones"}`
        )
    );
    (expediente.notas || []).slice(0, 4).forEach(n =>
        timelineItem(
            `${fechaCorta(n.fecha)} - ${n.psicologo || "Psicologo"}`,
            `${n.nota || "Sin nota"} | Plan: ${n.planAccion || "Sin plan"}`
        )
    );

    footer();
    agregarPaginacion();
    doc.setProperties({
        title: "MindCare | Expediente de seguimiento psicologico",
        subject: "Reporte clinico de seguimiento",
        author: "MindCare"
    });

    const nombreArchivo =
        `MindCare_Expediente_${(usuario.nombre || "Paciente")
            .replace(/[^a-z0-9]+/gi, "_")
            .replace(/^_+|_+$/g, "")}.pdf`;

    doc.save(nombreArchivo);
}

function texto(id, valor) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText = valor;
}

function fecha(valor) {

    if (!valor)
        return "-";

    return new Date(valor).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function fechaCorta(valor) {

    if (!valor)
        return "-";

    return new Date(valor).toLocaleDateString("es-MX");
}

function limpiarPDF(valor) {

    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

async function generarPDFClinicoNativo() {

    if (!expedienteActual)
        expedienteActual =
            await pedirJson(`${API}/ExpedienteClinico/${usuarioId}`);

    const expediente =
        expedienteActual;

    const usuario =
        expediente.usuario || {};

    const lineas = [];

    lineas.push("MindCare - Expediente clinico emocional");
    lineas.push(`Generado: ${new Date().toLocaleString("es-MX")}`);
    lineas.push("");
    lineas.push(`Paciente: ${usuario.nombre || "-"}`);
    lineas.push(`Correo: ${usuario.email || "-"}`);
    lineas.push(`Telefono: ${usuario.telefono || "-"}`);
    lineas.push(`Zona: ${usuario.zona || "-"}`);

    agregarSeccionPDF(lineas, "Resumen", [
        `Registros: ${expediente.resumen?.totalRegistros ?? 0}`,
        `Evaluaciones: ${expediente.resumen?.totalEvaluaciones ?? 0}`,
        `Citas: ${expediente.resumen?.totalCitas ?? 0}`,
        `Notas clinicas: ${expediente.resumen?.totalNotas ?? 0}`
    ]);

    agregarSeccionPDF(lineas, "Analisis IA", [
        `Nivel: ${expediente.ia?.nivel || "-"}`,
        `Score: ${expediente.ia?.score ?? 0}/100`,
        `Confianza: ${expediente.ia?.confianza ?? 0}%`,
        `Prioridad: ${expediente.ia?.prioridad || "-"}`,
        `Tendencia: ${expediente.ia?.tendencia || "-"}`,
        `Decision IA: ${expediente.ia?.decisionClinica?.nivelDecision || "-"}`,
        `Bienestar: ${expediente.ia?.indiceBienestar?.puntaje ?? 0}/100`,
        `Perfil: ${expediente.ia?.perfilClinico?.tipo || "-"}`,
        `Trayectoria: ${expediente.ia?.trayectoriaRiesgo?.estado || "-"}`,
        `Intervencion: ${expediente.ia?.matrizIntervencion?.nivel || "-"}`,
        expediente.ia?.decisionClinica?.resumen || "",
        expediente.ia?.matrizIntervencion?.objetivo || "",
        expediente.ia?.matrizIntervencion?.intervencion || "",
        expediente.ia?.mensaje || "Sin analisis disponible.",
        expediente.ia?.metodologia || "Motor local basado en reglas."
    ]);

    agregarSeccionPDF(
        lineas,
        "Preguntas inteligentes",
        (expediente.ia?.preguntasSeguimiento || [])
            .map((x, i) => `${i + 1}. ${x}`)
    );

    agregarSeccionPDF(
        lineas,
        "Recomendaciones",
        (expediente.ia?.recomendaciones || [])
            .map((x, i) => `${i + 1}. ${x}`)
    );

    agregarSeccionPDF(
        lineas,
        "Factores IA",
        (expediente.ia?.factores || [])
            .map(x =>
                `${x.fuente || "Factor"}: ${x.descripcion || ""} (${x.severidad || "-"}, peso ${x.peso || 0})`
            )
    );

    agregarSeccionPDF(
        lineas,
        "Ultimos registros emocionales",
        (expediente.registros || []).slice(0, 8).map(x =>
            `${fechaCorta(x.fecha)} - Animo ${x.nivelAnimo}/10, Estres ${x.nivelEstres}/10 - ${x.categoria || "General"} - ${x.nota || "Sin nota"}`
        )
    );

    agregarSeccionPDF(
        lineas,
        "Evaluaciones",
        [
            ...(expediente.phq9 || []).slice(0, 5).map(x =>
                `${fechaCorta(x.fecha)} - PHQ-9 ${x.puntaje} pts - ${x.nivel || "-"}`
            ),
            ...(expediente.estresLaboral || []).slice(0, 5).map(x =>
                `${fechaCorta(x.fecha)} - Test de estres ${x.puntaje} pts - ${x.nivel || "-"}`
            )
        ]
    );

    agregarSeccionPDF(
        lineas,
        "Citas y notas",
        [
            ...(expediente.citas || []).slice(0, 5).map(x =>
                `${fechaCorta(x.fecha)} - ${x.estado || "Pendiente"} - ${x.psicologo || "Psicologo"} - ${x.observacion || "Sin observaciones"}`
            ),
            ...(expediente.notas || []).slice(0, 5).map(x =>
                `${fechaCorta(x.fecha)} - ${x.psicologo || "Psicologo"} - ${x.nota || "Sin nota"} | Plan: ${x.planAccion || "Sin plan"}`
            )
        ]
    );

    lineas.push("");
    lineas.push("Aclaracion: MindCare es una herramienta de apoyo y monitoreo. No diagnostica ni sustituye atencion psicologica profesional.");

    descargarPDFNativo(
        lineas,
        `MindCare_Expediente_${(usuario.nombre || "Paciente")
            .replace(/[^a-z0-9]+/gi, "_")
            .replace(/^_+|_+$/g, "")}.pdf`
    );
}

function agregarSeccionPDF(lineas, titulo, elementos) {

    lineas.push("");
    lineas.push(titulo.toUpperCase());

    if (!elementos || !elementos.length) {
        lineas.push("- Sin datos.");
        return;
    }

    elementos.forEach(x => {
        lineas.push(`- ${x}`);
    });
}

function descargarPDFNativo(lineas, nombreArchivo) {

    const paginas =
        crearPaginasPDF(lineas.map(limpiarPDF), 92, 45);

    const encoder =
        new TextEncoder();

    const objects = [];

    function addObject(content) {
        objects.push(content);
        return objects.length;
    }

    const fontId =
        addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

    const pageIds = [];

    paginas.forEach(pagina => {
        const stream =
            crearStreamTextoPDF(pagina);

        const contentId =
            addObject(
                `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`
            );

        const pageId =
            addObject(
                `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
            );

        pageIds.push(pageId);
    });

    const pagesId =
        addObject(
            `<< /Type /Pages /Kids ${pageIds.map(id => `${id} 0 R`).join(" ")} /Count ${pageIds.length} >>`
        );

    pageIds.forEach(id => {
        objects[id - 1] =
            objects[id - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
    });

    const catalogId =
        addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((obj, index) => {
        offsets.push(encoder.encode(pdf).length);
        pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
    });

    const xrefOffset =
        encoder.encode(pdf).length;

    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    offsets.slice(1).forEach(offset => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });

    pdf +=
        `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob =
        new Blob([pdf], { type: "application/pdf" });

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function crearPaginasPDF(lineas, maxCaracteres, lineasPorPagina) {

    const expandidas = [];

    lineas.forEach(linea => {
        const limpia =
            linea || "";

        if (limpia.length <= maxCaracteres) {
            expandidas.push(limpia);
            return;
        }

        let actual = limpia;

        while (actual.length > maxCaracteres) {
            let corte =
                actual.lastIndexOf(" ", maxCaracteres);

            if (corte < 20)
                corte = maxCaracteres;

            expandidas.push(actual.slice(0, corte));
            actual = actual.slice(corte).trim();
        }

        if (actual)
            expandidas.push(actual);
    });

    const paginas = [];

    for (let i = 0; i < expandidas.length; i += lineasPorPagina) {
        paginas.push(expandidas.slice(i, i + lineasPorPagina));
    }

    return paginas.length ? paginas : [["MindCare - Sin datos"]];
}

function crearStreamTextoPDF(lineas) {

    const comandos = ["BT", "/F1 10 Tf", "50 790 Td", "14 TL"];

    lineas.forEach((linea, index) => {
        if (index > 0)
            comandos.push("T*");

        comandos.push(`(${escapePDF(linea)}) Tj`);
    });

    comandos.push("ET");

    return comandos.join("\n");
}

function escapePDF(valor) {

    return String(valor ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function crearHTMLImpresion(expediente) {

    const usuario = expediente.usuario || {};
    const ia = expediente.ia || {};

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>MindCare Expediente</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;color:#172033;margin:28px;line-height:1.45}
h1{font-size:26px;margin:0 0 6px} h2{font-size:18px;margin-top:22px;border-bottom:1px solid #dbe3ef;padding-bottom:6px}
.muted{color:#5b6b84}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
.card{border:1px solid #dbe3ef;border-radius:8px;padding:10px}.item{border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin:8px 0}
small{color:#5b6b84} @media print{button{display:none}}
</style>
</head>
<body>
<h1>MindCare - Expediente clinico emocional</h1>
<p class="muted">${escapeHtml(new Date().toLocaleString("es-MX"))}</p>
<h2>Paciente</h2>
<p><b>${escapeHtml(usuario.nombre || "-")}</b><br>${escapeHtml(usuario.email || "-")}<br>${escapeHtml(usuario.telefono || "-")}</p>
<div class="grid">
<div class="card"><small>Registros</small><br><b>${expediente.resumen?.totalRegistros ?? 0}</b></div>
<div class="card"><small>Evaluaciones</small><br><b>${expediente.resumen?.totalEvaluaciones ?? 0}</b></div>
<div class="card"><small>Score IA</small><br><b>${ia.score ?? 0}/100</b></div>
<div class="card"><small>Nivel</small><br><b>${escapeHtml(ia.nivel || "-")}</b></div>
</div>
<h2>Analisis IA</h2>
<p>${escapeHtml(ia.mensaje || "-")}</p>
<p class="muted">${escapeHtml(ia.metodologia || "")}</p>
<h2>Recomendaciones</h2>
${(ia.recomendaciones || []).map(x => `<div class="item">${escapeHtml(x)}</div>`).join("") || "<p>Sin datos.</p>"}
<h2>Registros emocionales</h2>
${(expediente.registros || []).slice(0, 10).map(x => `<div class="item"><b>${escapeHtml(fechaCorta(x.fecha))}</b><br>Animo ${x.nivelAnimo}/10 | Estres ${x.nivelEstres}/10<br>${escapeHtml(x.categoria || "General")} - ${escapeHtml(x.nota || "Sin nota")}</div>`).join("") || "<p>Sin registros.</p>"}
<h2>Notas clinicas</h2>
${(expediente.notas || []).slice(0, 10).map(x => `<div class="item"><b>${escapeHtml(fechaCorta(x.fecha))}</b><br>${escapeHtml(x.nota || "Sin nota")}<br><small>Plan: ${escapeHtml(x.planAccion || "Sin plan")}</small></div>`).join("") || "<p>Sin notas.</p>"}
<p class="muted">MindCare es una herramienta de apoyo. No sustituye diagnostico ni atencion profesional.</p>
</body>
</html>`;
}

function extraerMensaje(texto) {

    try {
        const data = JSON.parse(texto);
        return data.mensaje || data.title || texto;
    } catch {
        return String(texto || "Error de carga")
            .replaceAll('"', "")
            .trim();
    }
}

function escapeHtml(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
