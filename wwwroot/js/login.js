
const API =
    "https://mindcare-production-d670.up.railway.app/api";

/* ===================================================== */
async function login() {

    const email =
        document.getElementById("email")
            .value.trim();

    const password =
        document.getElementById("password")
            .value.trim();

    const mensaje =
        document.getElementById("mensaje");

    mensaje.innerText = "";

    if (!email || !password) {

        mostrarToast(
            "Completa correo y contraseña",
            "error"
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API}/Auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

        const texto =
            await response.text();

        if (!response.ok)
            throw new Error(texto);

        const data =
            JSON.parse(texto);

        /* GUARDAR */
        localStorage.setItem(
            "usuarioId",
            data.usuarioId || ""
        );

        localStorage.setItem(
            "nombre",
            data.nombre || "Usuario"
        );

        localStorage.setItem(
            "rol",
            data.rol || "Usuario"
        );

        mostrarToast("Bienvenido");

        setTimeout(() => {

            const rol =
                (data.rol || "usuario")
                    .toLowerCase();

            if (rol === "admin") {

                location.href =
                    "admin.html";

            }
            else if (
                rol === "psicologo" ||
                rol === "psicólogo"
            ) {

                location.href =
                    "psicologo/dashboardPsicologo.html";

            }
            else {

                location.href =
                    "dashboard.html";

            }

        }, 700);

    }
    catch (error) {

        mostrarToast(
            error.message
                .replaceAll('"', ''),
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