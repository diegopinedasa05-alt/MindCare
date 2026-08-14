const API = window.MINDCARE_API_BASE;
const usuarioId = localStorage.getItem("usuarioId");

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token") || !usuarioId) {
        window.location.href = "login.html";
        return;
    }

    cargarCitas();
});

async function cargarCitas() {
    const resultado = document.getElementById("resultado");
    const lista = document.getElementById("listaCitas");

    if (!resultado || !lista) return;

    resultado.textContent = "Cargando citas...";
    lista.innerHTML = "";

    try {
        const response = await fetch(
            `${API}/Citas/usuario/${encodeURIComponent(usuarioId)}?t=${Date.now()}`
        );

        if (!response.ok) {
            throw new Error("No fue posible consultar tus citas.");
        }

        const citas = await response.json();

        if (!Array.isArray(citas) || citas.length === 0) {
            resultado.textContent = "Todavía no tienes citas asignadas.";
            lista.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <strong>Aún no hay citas registradas</strong>
                    <span>Contacta a un psicólogo desde el directorio para solicitar seguimiento.</span>
                </div>
            `;
            return;
        }

        resultado.textContent = `${citas.length} cita${citas.length === 1 ? "" : "s"} registrada${citas.length === 1 ? "" : "s"}.`;

        citas.forEach(cita => {
            const item = document.createElement("article");
            item.className = "appointment-item";
            const estadoVisible = etiquetaEstado(cita.estado);
            const atencion = cita.fechaAtencionUtc
                ? `<small>Atención realizada: ${escapeHtml(formatearFecha(cita.fechaAtencionUtc))}</small>`
                : "";
            const trazabilidad = cita.fechaEstadoUtc
                ? `<small>Último cambio: ${escapeHtml(formatearFecha(cita.fechaEstadoUtc))}${cita.actualizadoPor ? ` por ${escapeHtml(cita.actualizadoPor)}` : ""}</small>`
                : "";
            item.innerHTML = `
                <div class="appointment-date">
                    <i class="fa-regular fa-calendar"></i>
                    <span>${escapeHtml(formatearFecha(cita.fecha))}</span>
                    ${atencion}
                </div>
                <div class="appointment-details">
                    <strong>${escapeHtml(cita.nombrePsicologo || `Psicólogo #${cita.psicologoId}`)}</strong>
                    <span>${escapeHtml(cita.observacion || "Sin observaciones registradas")}</span>
                    ${trazabilidad}
                </div>
                <span class="appointment-status ${normalizarEstado(cita.estado)}">${escapeHtml(estadoVisible)}</span>
            `;
            lista.appendChild(item);
        });
    } catch (error) {
        resultado.textContent = error.message;
        lista.innerHTML = `
            <div class="empty-state error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <strong>No se pudieron cargar tus citas</strong>
                <span>Intenta actualizar la pantalla nuevamente.</span>
            </div>
        `;
    }
}

function formatearFecha(valor) {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "Fecha pendiente";

    return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(fecha);
}

function normalizarEstado(estado) {
    const valor = String(estado || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    if (valor.includes("cancel")) return "cancelada";
    if (valor.includes("atendid") || valor.includes("complet")) return "atendida";
    if (valor.includes("confirm")) return "confirmada";
    if (valor.includes("no asist")) return "no-asistio";
    return "pendiente";
}

function etiquetaEstado(estado) {
    const valor = normalizarEstado(estado);
    if (valor === "no-asistio") return "No asistió";
    return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function escapeHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
