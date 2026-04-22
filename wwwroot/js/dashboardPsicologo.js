const API = "https://mindcare-production-d670.up.railway.app/api";

const psicologoId =
    localStorage.getItem("usuarioId");

let usuarioCita = 0;
let calendar;

/* ==========================
LOAD
========================== */
window.onload = async function () {

    iniciarCalendario();

    await cargarEventos();

    await cargarMetricas();

};

/* ==========================
BUSCAR PACIENTE
========================== */
async function buscarUsuario() {

    const correo =
        document.getElementById("buscar")
            .value.trim();

    if (!correo) return;

    try {

        const res =
            await fetch(
                `${API}/Usuarios/buscar-correo/${correo}`
            );

        if (!res.ok) throw "";

        const data =
            await res.json();

        tablaUsuarios.innerHTML = `
<tr>
<td>
<strong>${data.nombre}</strong><br>
<small>${data.email}</small>
</td>

<td>
<button onclick="verHistorial(${data.id})">
Historial
</button>

<button onclick="agendarCita(${data.id})">
Agendar
</button>
</td>
</tr>
`;

    } catch {

        tablaUsuarios.innerHTML = `
<tr>
<td colspan="2">
Paciente no encontrado
</td>
</tr>
`;

        toast(
            "No encontrado",
            "error"
        );

    }

}

/* ==========================
CALENDARIO
========================== */
function iniciarCalendario() {

    calendar =
        new FullCalendar.Calendar(
            document.getElementById("calendar"),
            {
                initialView: "dayGridMonth",
                locale: "es",
                height: "auto",
                headerToolbar: {
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek"
                }
            }
        );

    calendar.render();

}

/* ==========================
EVENTOS
========================== */
async function cargarEventos() {

    const res =
        await fetch(
            `${API}/Citas/psicologo/${psicologoId}`
        );

    const lista =
        await res.json();

    calendar.removeAllEvents();

    lista.forEach(x => {

        calendar.addEvent({
            title: x.nombrePaciente,
            start: x.fecha
        });

    });

}

/* ==========================
METRICAS + IA
========================== */
async function cargarMetricas() {

    const res =
        await fetch(
            `${API}/Citas/psicologo/${psicologoId}`
        );

    const lista =
        await res.json();

    /* pacientes */

    setNum(
        "totalPacientes",
        new Set(
            lista.map(x => x.usuarioId)
        ).size
    );

    /* pendientes */

    setNum(
        "pendientes",
        lista.filter(x =>
            x.estado === "Pendiente"
        ).length
    );

    /* hoy */

    const hoy =
        new Date().toDateString();

    setNum(
        "citasHoy",
        lista.filter(x =>
            new Date(x.fecha)
                .toDateString() === hoy
        ).length
    );

    /* IA */

    let riesgo = 0;

    for (let c of lista) {

        try {

            const r =
                await fetch(
                    `${API}/HistorialPredictivo/usuario/${c.usuarioId}`
                );

            const h =
                await r.json();

            if (
                h.length &&
                (
                    h[0].nivelRiesgo.includes("Alto") ||
                    h[0].nivelRiesgo.includes("Severo") ||
                    h[0].nivelRiesgo.includes("🔴")
                )
            ) {
                riesgo++;
            }

        } catch { }

    }

    setNum(
        "riesgoAlto",
        riesgo
    );

    if (riesgo >= 3) {

        toast(
            "⚠ Pacientes críticos detectados",
            "error"
        );

    }
    else if (riesgo >= 1) {

        toast(
            "🟡 Hay pacientes prioritarios"
        );

    }

}

/* ==========================
HISTORIAL
========================== */
function verHistorial(id) {

    window.open(
        `../historialUsuario.html?id=${id}`,
        "_blank"
    );

}

/* ==========================
MODAL
========================== */
function agendarCita(id) {

    usuarioCita = id;

    modalCita.style.display =
        "flex";

}

function cerrarModal() {

    modalCita.style.display =
        "none";

}

/* ==========================
GUARDAR CITA
========================== */
async function guardarCita() {

    const fecha =
        fechaCita.value;

    const nota =
        notaCita.value;

    if (!fecha) {

        toast(
            "Selecciona fecha",
            "error"
        );

        return;
    }

    await fetch(
        `${API}/Citas`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json"
            },
            body: JSON.stringify({
                usuarioId: usuarioCita,
                psicologoId: psicologoId,
                fecha: fecha,
                estado: "Pendiente",
                observacion: nota
            })
        }
    );

    cerrarModal();

    await cargarEventos();

    await cargarMetricas();

    toast(
        "Cita creada"
    );

}

/* ==========================
LOGOUT
========================== */
function logout() {

    localStorage.clear();

    location.href =
        "../login.html";

}

/* ==========================
UTIL
========================== */
function setNum(id, v) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText = v;

}

function toast(
    msg,
    tipo = "ok"
) {

    const t =
        document.getElementById("toast");

    if (!t) return;

    t.className = "";
    t.innerText = msg;

    if (tipo === "error")
        t.classList.add("error");

    t.classList.add("show");

    setTimeout(() => {
        t.className = "";
    }, 3000);

}