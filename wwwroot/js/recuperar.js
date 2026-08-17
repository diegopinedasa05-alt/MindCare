/* =====================================
recuperar.js LIMPIO FINAL
===================================== */

var API = window.MINDCARE_API_BASE;

function mostrarMensaje(texto, tipo = "info") {
    const mensaje = document.getElementById("mensaje");
    mensaje.style.color = tipo === "error" ? "#dc2626" : "#0f766e";
    mensaje.innerText = texto;
}

function extraerMensaje(texto) {
    try {
        const data = JSON.parse(texto);
        return data?.mensaje || data?.title || "No se pudo completar la solicitud.";
    } catch {
        return texto || "No se pudo completar la solicitud.";
    }
}

function cambiarEstadoBoton(id, ocupado, texto) {
    const boton = document.getElementById(id);
    if (!boton) return;
    boton.disabled = ocupado;
    if (texto) boton.innerHTML = texto;
}

async function solicitarConTiempo(url, opciones, milisegundos = 25_000) {
    const controlador = new AbortController();
    const temporizador = setTimeout(
        () => controlador.abort(),
        milisegundos
    );

    try {
        return await fetch(url, {
            ...opciones,
            signal: controlador.signal
        });
    } catch (error) {
        if (error?.name === "AbortError") {
            throw new Error(
                "El servicio de correo tardo demasiado. Intenta nuevamente en unos minutos."
            );
        }
        throw error;
    } finally {
        clearTimeout(temporizador);
    }
}

/* =====================================
ENVIAR CÓDIGO
===================================== */
async function enviarCodigo() {
    const email =
        document.getElementById("email").value.trim();

    if (!email) {
        mostrarMensaje("Ingresa tu correo.", "error");
        return;
    }

    cambiarEstadoBoton(
        "enviarCodigoBtn",
        true,
        '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...'
    );

    try {
        const res = await solicitarConTiempo(
            `${API}/Auth/enviar-codigo`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(email)
            }
        );

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(extraerMensaje(txt));

        mostrarMensaje(
            "Revisa tu correo. El código vence en 15 minutos."
        );

        document.getElementById("paso1").style.display =
            "none";

        document.getElementById("paso2").style.display =
            "block";

    } catch (error) {
        mostrarMensaje(error.message, "error");
    } finally {
        cambiarEstadoBoton(
            "enviarCodigoBtn",
            false,
            '<i class="fa-solid fa-paper-plane"></i> Enviar código'
        );
    }
}
/* =====================================
CAMBIAR PASSWORD
===================================== */
async function cambiarPassword() {
    const email =
        document.getElementById("email").value.trim();

    const codigo =
        document.getElementById("codigo").value.trim();

    const password =
        document.getElementById("password").value.trim();

    const confirmacion =
        document.getElementById("confirmarPassword").value;

    if (!/^\d{6}$/.test(codigo)) {
        mostrarMensaje("Ingresa el código de seis dígitos.", "error");
        return;
    }

    if (password.length < 10) {
        mostrarMensaje("La contraseña debe tener al menos 10 caracteres.", "error");
        return;
    }

    if (password !== confirmacion) {
        mostrarMensaje("Las contraseñas no coinciden.", "error");
        return;
    }

    cambiarEstadoBoton(
        "cambiarPasswordBtn",
        true,
        '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...'
    );

    try {
        const res = await solicitarConTiempo(
            `${API}/Auth/recuperar`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    codigo: codigo,
                    nuevaPassword: password
                })
            }
        );

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(extraerMensaje(txt));

        mostrarMensaje("Contraseña actualizada. Redirigiendo al inicio de sesión.");

        setTimeout(() => {
            location.href = "login.html";
        }, 1500);

    } catch (error) {
        mostrarMensaje(error.message, "error");
    } finally {
        cambiarEstadoBoton(
            "cambiarPasswordBtn",
            false,
            '<i class="fa-solid fa-rotate"></i> Actualizar contraseña'
        );
    }
}
