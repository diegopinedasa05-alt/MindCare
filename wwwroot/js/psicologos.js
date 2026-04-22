/* ==========================================
wwwroot/js/psicologos.js
CÓDIGO COMPLETO
========================================== */

const API = "https://mindcare-production-d670.up.railway.app/api";

/* ==========================================
CARGAR PSICÓLOGOS
========================================== */
async function cargarPsicologos() {

    try {

        const res =
            await fetch(
                `${API}/Usuarios/psicologos`
            );

        const data =
            await res.json();

        const contenedor =
            document.getElementById(
                "listaPsicologos"
            );

        contenedor.innerHTML = "";

        if (!data.length) {

            contenedor.innerHTML = `
<div class="card-psico">
<h3>Sin resultados</h3>
<p>No hay psicólogos registrados.</p>
</div>
`;
            return;
        }

        data.forEach(p => {

            const card =
                document.createElement("div");

            card.className =
                "card-psico";

            card.innerHTML = `

<div class="avatar">
<i class="fa-solid fa-user-doctor"></i>
</div>

<h3>${p.nombre}</h3>

<div class="info">

<p>
<i class="fa-solid fa-brain"></i>
<strong>Especialidad:</strong>
${p.especialidad || "General"}
</p>

<p>
<i class="fa-solid fa-location-dot"></i>
<strong>Zona:</strong>
${p.zona || "Sin zona"}
</p>

<p>
<i class="fa-solid fa-envelope"></i>
<strong>Correo:</strong>
${p.email}
</p>

<p>
<i class="fa-solid fa-phone"></i>
<strong>Teléfono:</strong>
${p.telefono || "No disponible"}
</p>

</div>

<div class="botones">

<button
class="btn-whats"
onclick="abrirWhats('${p.telefono || ""}')">

<i class="fa-brands fa-whatsapp"></i>
WhatsApp

</button>

</div>
`;

            contenedor.appendChild(card);

        });

    }
    catch {

        mostrarToast(
            "Error cargando psicólogos",
            "error"
        );

    }

}

/* ==========================================
WHATSAPP
========================================== */
function abrirWhats(numero) {

    if (!numero) {

        mostrarToast(
            "Sin teléfono disponible",
            "error"
        );

        return;
    }

    let limpio =
        numero.replace(/\D/g, "");

    window.open(
        `https://wa.me/52${limpio}`,
        "_blank"
    );

}

/* ==========================================
VOLVER
========================================== */
function volver() {

    window.location.href =
        "dashboard.html";

}

/* ==========================================
TOAST
========================================== */
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

    toast.innerText =
        mensaje;

    if (tipo === "error")
        toast.classList.add(
            "error"
        );

    toast.classList.add(
        "show"
    );

    setTimeout(() => {

        toast.className = "";

    }, 3000);

}

/* ==========================================
LOAD
========================================== */
window.onload = function () {

    cargarPsicologos();

};