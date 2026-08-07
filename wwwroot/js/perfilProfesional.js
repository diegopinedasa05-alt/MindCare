const API = window.MINDCARE_API_BASE;

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const rol = (localStorage.getItem("rol") || "").toLowerCase();

    if (!token || rol !== "psicologo") {
        location.href = "../login.html";
        return;
    }

    document.getElementById("documentForm")
        .addEventListener("submit", cargarDocumento);
    cargarPerfil();
});

async function cargarPerfil() {
    const estado = document.getElementById("estadoCuenta");
    const datos = document.getElementById("datosPerfil");
    const documentos = document.getElementById("documentos");

    try {
        const response = await fetch(`${API}/psicologos-profesionales/mi-perfil`);

        if (response.status === 404) {
            estado.innerHTML = `
                <span class="status-label">Cuenta heredada</span>
                <strong>Regularización pendiente</strong>
                <p>Esta cuenta fue creada antes del módulo de verificación. Solicita su actualización al administrador.</p>`;
            datos.innerHTML = "<div><dt>Perfil</dt><dd>Sin expediente profesional asociado</dd></div>";
            document.getElementById("documentForm").hidden = true;
            return;
        }

        const text = await response.text();
        if (!response.ok)
            throw new Error(extraerMensaje(text));

        const perfil = JSON.parse(text);
        const estadoNormalizado = perfil.estadoVerificacion || "Pendiente";
        estado.className = `status-panel ${claseEstado(estadoNormalizado)}`;
        estado.innerHTML = `
            <span class="status-label">Estado de verificación</span>
            <strong>${escapeHtml(estadoNormalizado)}</strong>
            <p>${mensajeEstado(estadoNormalizado, perfil.observaciones)}</p>`;

        datos.innerHTML = [
            ["Nombre", perfil.nombre],
            ["Correo", perfil.email],
            ["Cédula", perfil.numeroCedula],
            ["Institución", perfil.institucion],
            ["Especialidad", perfil.especialidad],
            ["Experiencia", perfil.aniosExperiencia == null ? "No indicada" : `${perfil.aniosExperiencia} años`]
        ].map(([titulo, valor]) => `<div><dt>${titulo}</dt><dd>${escapeHtml(valor || "No indicado")}</dd></div>`).join("");

        documentos.innerHTML = (perfil.documentos || []).map(documento => `
            <div class="document-item">
                <i class="fa-solid fa-file-shield"></i>
                <div><strong>${escapeHtml(documento.tipoDocumento)}</strong><span>${escapeHtml(documento.nombreOriginal)} · ${escapeHtml(documento.estado)}</span></div>
            </div>`).join("") || "<p class=\"empty-state\">Aún no hay documentos cargados.</p>";
    } catch (error) {
        estado.className = "status-panel error";
        estado.innerHTML = `<span class="status-label">No disponible</span><strong>No fue posible consultar el perfil</strong><p>${escapeHtml(error.message || "Intenta nuevamente.")}</p>`;
    }
}

async function cargarDocumento(event) {
    event.preventDefault();
    const input = document.getElementById("documentoCedula");
    const message = document.getElementById("uploadMessage");
    const button = event.currentTarget.querySelector("button");
    const file = input.files[0];

    if (!file) {
        message.textContent = "Selecciona un documento válido.";
        return;
    }

    const formData = new FormData();
    formData.append("archivo", file);
    button.disabled = true;
    message.textContent = "Enviando documento de forma segura...";

    try {
        const response = await fetch(
            `${API}/psicologos-profesionales/mi-perfil/documentos/cedula`,
            { method: "POST", body: formData }
        );
        const text = await response.text();
        if (!response.ok)
            throw new Error(extraerMensaje(text));

        input.value = "";
        message.textContent = "Documento enviado. El estado se actualizará después de la revisión administrativa.";
        await cargarPerfil();
    } catch (error) {
        message.textContent = error.message || "No se pudo enviar el documento.";
    } finally {
        button.disabled = false;
    }
}

function claseEstado(estado) {
    return String(estado).toLowerCase() === "verificado" ? "verified" : "pending";
}

function mensajeEstado(estado, observaciones) {
    if (observaciones)
        return observaciones;
    return String(estado).toLowerCase() === "verificado"
        ? "La cuenta está habilitada para las funciones clínicas."
        : "La cuenta permanece limitada a la regularización hasta completar la revisión administrativa.";
}

function extraerMensaje(texto) {
    try {
        const data = JSON.parse(texto);
        return data.mensaje || data.title || texto;
    } catch {
        return String(texto || "").replaceAll('"', "").trim();
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
