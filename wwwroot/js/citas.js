const API = window.MINDCARE_API_BASE;

const psicologoId = localStorage.getItem("usuarioId");

// ===============================
// 🔥 CARGAR PACIENTES (DROPDOWN)
// ===============================
function cargarPacientes() {

    fetch(`${API}/Usuarios/pacientes`)
        .then(res => res.json())
        .then(data => {

            const select = document.getElementById("pacienteId");

            select.innerHTML = '<option value="">Selecciona paciente</option>';

            data.forEach(p => {

                const option = document.createElement("option");

                option.value = p.id;
                option.text = p.nombre;

                select.appendChild(option);
            });
        });
}

// ===============================
// 🔥 CREAR CITA
// ===============================
function crearCita() {

    const pacienteId = document.getElementById("pacienteId").value;
    const fecha = document.getElementById("fecha").value;

    if (!pacienteId || !fecha) {
        alert("Completa todos los campos");
        return;
    }

    fetch(`${API}/Citas`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuarioId: parseInt(pacienteId),
            psicologoId: parseInt(psicologoId),
            fecha: fecha,
            estado: "Pendiente",
            observacion: ""
        })
    })
        .then(() => {
            alert("Cita creada");
            cargarCitas();
        });
}

// ===============================
// 🔥 CARGAR CITAS
// ===============================
function cargarCitas() {

    fetch(`${API}/Citas/psicologo/${psicologoId}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("listaCitas");
            lista.innerHTML = "";

            data.forEach(c => {

                const li = document.createElement("li");

                li.innerText =
                    "Paciente: " + c.nombrePaciente +
                    " | Fecha: " + new Date(c.fecha).toLocaleString();

                lista.appendChild(li);
            });
        });
}

// ===============================
function volver() {
    window.location.href = "dashboardPsicologo.html";
}

// ===============================
cargarPacientes();
cargarCitas();
