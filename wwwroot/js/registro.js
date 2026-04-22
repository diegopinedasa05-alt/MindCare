/* =====================================
   wwwroot/js/registro.js
   REEMPLAZA COMPLETO
===================================== */

const API = "https://mindcare-production-d670.up.railway.app/api";

/* =====================================
LOAD
===================================== */
window.onload = function () {

    const inputs =
        document.querySelectorAll("input");

    inputs.forEach(x => {

        x.addEventListener(
            "keydown",
            function (e) {

                if (e.key === "Enter")
                    registrar();

            });

    });

};

/* =====================================
REGISTRAR
===================================== */
async function registrar() {

    const nombre =
        document.getElementById("nombre")
            .value.trim();

    const email =
        document.getElementById("email")
            .value.trim();

    const password =
        document.getElementById("password")
            .value.trim();

    const telefono =
        document.getElementById("telefono")
            .value.trim();

    const zona =
        document.getElementById("zona")
            .value.trim();

    const msg =
        document.getElementById("msg");

    msg.innerText = "";

    /* ===============================
       VALIDACIONES
    =============================== */

    if (!nombre || !email || !password) {

        msg.innerText =
            "Completa nombre, correo y contraseña.";

        msg.style.color =
            "#ef4444";

        mostrarToast(
            "Faltan campos obligatorios",
            "error"
        );

        return;
    }

    if (!email.includes("@")) {

        msg.innerText =
            "Correo inválido.";

        msg.style.color =
            "#ef4444";

        return;
    }

    if (password.length < 6) {

        msg.innerText =
            "La contraseña debe tener mínimo 6 caracteres.";

        msg.style.color =
            "#ef4444";

        return;
    }

    const body = {

        nombre: nombre,
        email: email,
        password: password,
        telefono: telefono,
        zona: zona,
        rol: "Usuario",
        especialidad: ""

    };

    try {

        mostrarToast(
            "Creando cuenta...",
            "info"
        );

        const res =
            await fetch(
                `${API}/Auth/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(body)
                });

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(txt);

        msg.style.color =
            "#16a34a";

        msg.innerText =
            "Cuenta creada correctamente";

        mostrarToast(
            "Registro exitoso"
        );

        limpiarFormulario();

        setTimeout(() => {

            location.href =
                "login.html";

        }, 1400);

    }
    catch (error) {

        msg.style.color =
            "#ef4444";

        msg.innerText =
            limpiarTexto(
                error.message
            ) || "No se pudo registrar.";

        mostrarToast(
            "Error al registrar",
            "error"
        );

    }

}

/* =====================================
UTILIDADES
===================================== */
function limpiarFormulario() {

    document.getElementById("nombre").value = "";
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("zona").value = "";

}

function limpiarTexto(txt) {

    return txt
        .replaceAll('"', '')
        .replaceAll("{", "")
        .replaceAll("}", "");

}

/* =====================================
TOAST PREMIUM
===================================== */
function mostrarToast(
    mensaje,
    tipo = "ok"
) {

    const toast =
        document.getElementById("toast");

    if (!toast) return;

    toast.className = "";
    toast.innerText = mensaje;

    if (tipo === "error")
        toast.classList.add("error");

    if (tipo === "info")
        toast.classList.add("info");

    toast.classList.add("show");

    setTimeout(() => {

        toast.className = "";

    }, 3000);

}