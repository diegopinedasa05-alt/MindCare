const API = window.MINDCARE_API_BASE;

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const rol = (localStorage.getItem("rol") || "").toLowerCase();

    if (!token || rol !== "admin") {
        window.location.href = "../login.html";
    }
});

async function registrarPsicologo() {
    const msg = document.getElementById("msg");
    const data = {
        nombre: valor("nombre"),
        apellidoPaterno: valor("apellidoPaterno"),
        apellidoMaterno: valor("apellidoMaterno"),
        email: valor("email"),
        password: valor("password"),
        telefono: valor("telefono"),
        zona: valor("zona"),
        numeroCedula: valor("cedula"),
        institucion: valor("institucion"),
        especialidad: valor("especialidad"),
        aniosExperiencia: valor("experiencia")
            ? Number(valor("experiencia"))
            : null,
        aceptaTerminos: document.getElementById("aceptaTerminos").checked
    };

    msg.textContent = "";

    if (Object.entries(data)
        .filter(([key]) => !["aniosExperiencia", "aceptaTerminos"].includes(key))
        .some(([, value]) => !value) || !data.aceptaTerminos) {
        mostrarMensaje("Completa los datos profesionales obligatorios.", "error");
        return;
    }

    if (data.password.length < 10) {
        mostrarMensaje("La contraseña temporal debe tener al menos 10 caracteres.", "error");
        return;
    }

    try {
        const response = await fetch(`${API}/psicologos-profesionales/registro`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const texto = await response.text();

        if (!response.ok)
            throw new Error(extraerMensaje(texto));

        mostrarMensaje(
            "Perfil creado. El profesional debe cargar su cédula desde Mi verificación.",
            "ok"
        );
        limpiarCampos();
    } catch (error) {
        mostrarMensaje(
            error.message || "No se pudo registrar el perfil profesional.",
            "error"
        );
    }
}

function limpiarCampos() {
    [
        "nombre", "apellidoPaterno", "apellidoMaterno", "email", "password",
        "telefono", "zona", "cedula", "institucion", "especialidad", "experiencia"
    ].forEach(id => {
        document.getElementById(id).value = "";
    });
    document.getElementById("aceptaTerminos").checked = false;
}

function valor(id) {
    return document.getElementById(id).value.trim();
}

function mostrarMensaje(texto, tipo) {
    const msg = document.getElementById("msg");
    msg.style.color = tipo === "error" ? "#b42318" : "#087f5b";
    msg.textContent = texto;
}

function extraerMensaje(texto) {
    try {
        const data = JSON.parse(texto);
        return data.mensaje || data.title || texto;
    } catch {
        return String(texto || "").replaceAll('"', "").trim();
    }
}
