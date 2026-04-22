/* ==========================================
MINDCARE ADMIN.JS COMPLETO CORREGIDO
FUNCIONES + DASHBOARD + MODAL + ELIMINAR
========================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

let grafica = null;

/* =====================================
LOAD
===================================== */
window.onload = async function () {

    await iniciar();

};

/* =====================================
INICIAR
===================================== */
async function iniciar() {

    await cargarResumen();
    await cargarUsuarios();
    await cargarPsicologos();
    crearGrafica();

}

/* =====================================
RESUMEN
===================================== */
async function cargarResumen() {

    try {

        const res =
            await fetch(
                `${API}/Admin/resumen?t=${Date.now()}`
            );

        const data =
            await res.json();

        texto("usuarios", data.usuarios);
        texto("psicologos", data.psicologos);
        texto("citas", data.citas);
        texto("riesgo", data.riesgoAlto);
        texto("tests", data.tests);
        texto("registros", data.registros);

    } catch {

        toast(
            "Error cargando resumen",
            "error"
        );
    }
}

/* =====================================
USUARIOS
===================================== */
async function cargarUsuarios() {

    try {

        const res =
            await fetch(
                `${API}/Admin/usuarios-recientes?t=${Date.now()}`
            );

        const lista =
            await res.json();

        let html = "";

        lista.forEach(x => {

            html += `
<tr>
<td>${x.nombre}</td>
<td>${new Date(x.fecha).toLocaleDateString()}</td>
<td>${x.zona || "-"}</td>
</tr>
`;
        });

        textoHTML(
            "tablaUsuarios",
            html
        );

    } catch {

        textoHTML(
            "tablaUsuarios",
            `<tr><td colspan="3">Sin datos</td></tr>`
        );
    }
}

/* =====================================
PSICOLOGOS
===================================== */
async function cargarPsicologos() {

    try {

        const res =
            await fetch(
                `${API}/Admin/psicologos?t=${Date.now()}`
            );

        const lista =
            await res.json();

        let html = "";

        lista.forEach(x => {

            html += `
<tr>
<td>${x.nombre}</td>
<td>${x.zona || "-"}</td>
<td>${x.especialidad || "-"}</td>

<td>
<button
class="btn-danger"
onclick="eliminarPsicologo(${x.id})">
Eliminar
</button>
</td>

</tr>
`;
        });

        textoHTML(
            "tablaPsicologos",
            html
        );

    } catch {

        textoHTML(
            "tablaPsicologos",
            `<tr><td colspan="4">Sin datos</td></tr>`
        );
    }
}

/* =====================================
ABRIR MODAL
===================================== */
function abrirModalPsicologo() {

    const modal =
        document.getElementById(
            "modalPsicologo"
        );

    modal.style.display =
        "flex";
}

/* =====================================
CERRAR MODAL
===================================== */
function cerrarModalPsicologo() {

    const modal =
        document.getElementById(
            "modalPsicologo"
        );

    modal.style.display =
        "none";
}

/* =====================================
GUARDAR PSICOLOGO
===================================== */
async function guardarPsicologo() {

    const body = {

        nombre:
            valor("nombrePsico"),

        email:
            valor("correoPsico"),

        password:
            valor("passPsico"),

        telefono:
            valor("telPsico"),

        zona:
            valor("zonaPsico"),

        especialidad:
            valor("espPsico")
    };

    const res =
        await fetch(
            `${API}/Admin/registrar-psicologo`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify(body)
            }
        );

    const txt =
        await res.text();

    if (!res.ok) {

        toast(
            txt,
            "error"
        );

        return;
    }

    toast(
        "Psicólogo creado"
    );

    cerrarModalPsicologo();

    await iniciar();
}

/* =====================================
ELIMINAR
===================================== */
async function eliminarPsicologo(id) {

    if (!confirm(
        "¿Eliminar psicólogo?"
    )) return;

    const res =
        await fetch(
            `${API}/Admin/eliminar-psicologo/${id}`,
            {
                method: "DELETE"
            }
        );

    const txt =
        await res.text();

    toast(txt);

    await iniciar();
}

/* =====================================
GRAFICA
===================================== */
function crearGrafica() {

    const canvas =
        document.getElementById(
            "graficaAdmin"
        );

    if (!canvas) return;

    if (grafica)
        grafica.destroy();

    grafica =
        new Chart(canvas, {
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
                    borderRadius: 12
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
}

/* =====================================
LOGOUT
===================================== */
function logout() {

    localStorage.clear();

    location.href =
        "login.html";
}

/* =====================================
TOAST
===================================== */
function toast(
    msg,
    tipo = "ok"
) {

    const t =
        document.getElementById(
            "toast"
        );

    if (!t) return;

    t.className = "";
    t.innerText = msg;

    if (tipo === "error")
        t.classList.add(
            "error"
        );

    t.classList.add(
        "show"
    );

    setTimeout(() => {

        t.className = "";

    }, 3000);
}

/* =====================================
UTILIDADES
===================================== */
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

    return el ?
        el.value : "";
}

function numero(id) {

    const el =
        document.getElementById(id);

    if (!el) return 0;

    return parseInt(
        el.innerText
    ) || 0;
}