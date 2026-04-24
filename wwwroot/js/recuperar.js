/* =====================================================
   recuperar.js COMPLETO CORREGIDO
   ✅ Rutas correctas /Auth/
   ✅ Compatible con tu backend actual
   ✅ Toast visual
   ✅ Flujo completo recuperar contraseña
===================================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

/* =====================================================
ENVIAR CODIGO
===================================================== */
async function enviarCodigo() {

    const email =
        document.getElementById("email")
            .value.trim();

    const mensaje =
        document.getElementById("mensaje");

    mensaje.innerText = "";

    if (!email) {

        mensaje.style.color = "#ef4444";
        mensaje.innerText =
            "Ingresa tu correo.";

        mostrarToast(
            "Correo requerido",
            "error"
        );

        return;
    }

    try {

        mostrarToast(
            "Enviando código...",
            "info"
        );

        const res =
            await fetch(
                `${API}/Auth/enviar-codigo`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify(email)
                }
            );

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(txt);

        mensaje.style.color =
            "#16a34a";

        mensaje.innerText =
            txt || "Código enviado.";

        /* MOSTRAR PASO 2 */
        const paso1 =
            document.getElementById("paso1");

        const paso2 =
            document.getElementById("paso2");

        if (paso1)
            paso1.style.display =
                "none";

        if (paso2)
            paso2.style.display =
                "block";

        mostrarToast(
            "Código enviado"
        );

    } catch (error) {

        mensaje.style.color =
            "#ef4444";

        mensaje.innerText =
            error.message;

        mostrarToast(
            "Error al enviar código",
            "error"
        );
    }
}

/* =====================================================
CAMBIAR PASSWORD
===================================================== */
async function cambiarPassword() {

    const email =
        document.getElementById("email")
            .value.trim();

    const codigo =
        document.getElementById("codigo")
            .value.trim();

    const password =
        document.getElementById("password")
            .value.trim();

    const mensaje =
        document.getElementById("mensaje");

    if (!codigo || !password) {

        mensaje.style.color =
            "#ef4444";

        mensaje.innerText =
            "Completa código y contraseña.";

        mostrarToast(
            "Faltan datos",
            "error"
        );

        return;
    }

    try {

        mostrarToast(
            "Actualizando...",
            "info"
        );

        const res =
            await fetch(
                `${API}/Auth/recuperar`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
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
            throw new Error(txt);

        mensaje.style.color =
            "#16a34a";

        mensaje.innerText =
            txt || "Contraseña actualizada.";

        mostrarToast(
            "Contraseña actualizada"
        );

        setTimeout(() => {

            location.href =
                "login.html";

        }, 1500);

    } catch (error) {

        mensaje.style.color =
            "#ef4444";

        mensaje.innerText =
            error.message;

        mostrarToast(
            "Error al actualizar",
            "error"
        );
    }
}

/* =====================================================
TOAST
===================================================== */
function mostrarToast(
    mensaje,
    tipo = "ok"
) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) return;

    toast.className = "";
    toast.innerText = mensaje;

    if (tipo === "error")
        toast.classList.add(
            "error"
        );

    if (tipo === "info")
        toast.classList.add(
            "info"
        );

    toast.classList.add(
        "show"
    );

    setTimeout(() => {

        toast.className = "";

    }, 3000);
} const API =
    "https://mindcare-production-d670.up.railway.app/api";

/* =====================================================
ENVIAR CODIGO
===================================================== */
async function enviarCodigo() {

    const email =
        document.getElementById("email")
            .value.trim();

    const mensaje =
        document.getElementById("mensaje");

    mensaje.innerText = "";

    if (!email) {

        mensaje.style.color = "#ef4444";
        mensaje.innerText =
            "Ingresa tu correo.";

        mostrarToast(
            "Correo requerido",
            "error"
        );

        return;
    }

    try {

        mostrarToast(
            "Enviando código...",
            "info"
        );

        const res =
            await fetch(
                `${API}/Auth/enviar-codigo`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify(email)
                }
            );

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(txt);

        mensaje.style.color =
            "#16a34a";

        mensaje.innerText =
            txt || "Código enviado.";

        /* MOSTRAR PASO 2 */
        const paso1 =
            document.getElementById("paso1");

        const paso2 =
            document.getElementById("paso2");

        if (paso1)
            paso1.style.display =
                "none";

        if (paso2)
            paso2.style.display =
                "block";

        mostrarToast(
            "Código enviado"
        );

    } catch (error) {

        mensaje.style.color =
            "#ef4444";

        mensaje.innerText =
            error.message;

        mostrarToast(
            "Error al enviar código",
            "error"
        );
    }
}

/* =====================================================
CAMBIAR PASSWORD
===================================================== */
async function cambiarPassword() {

    const email =
        document.getElementById("email")
            .value.trim();

    const codigo =
        document.getElementById("codigo")
            .value.trim();

    const password =
        document.getElementById("password")
            .value.trim();

    const mensaje =
        document.getElementById("mensaje");

    if (!codigo || !password) {

        mensaje.style.color =
            "#ef4444";

        mensaje.innerText =
            "Completa código y contraseña.";

        mostrarToast(
            "Faltan datos",
            "error"
        );

        return;
    }

    try {

        mostrarToast(
            "Actualizando...",
            "info"
        );

        const res =
            await fetch(
                `${API}/Auth/recuperar`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
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
            throw new Error(txt);

        mensaje.style.color =
            "#16a34a";

        mensaje.innerText =
            txt || "Contraseña actualizada.";

        mostrarToast(
            "Contraseña actualizada"
        );

        setTimeout(() => {

            location.href =
                "login.html";

        }, 1500);

    } catch (error) {

        mensaje.style.color =
            "#ef4444";

        mensaje.innerText =
            error.message;

        mostrarToast(
            "Error al actualizar",
            "error"
        );
    }
}

/* =====================================================
TOAST
===================================================== */
function mostrarToast(
    mensaje,
    tipo = "ok"
) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) return;

    toast.className = "";
    toast.innerText = mensaje;

    if (tipo === "error")
        toast.classList.add(
            "error"
        );

    if (tipo === "info")
        toast.classList.add(
            "info"
        );

    toast.classList.add(
        "show"
    );

    setTimeout(() => {

        toast.className = "";

    }, 3000);
}