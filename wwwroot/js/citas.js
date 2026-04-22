const API = "https://mindcare-production-d670.up.railway.app/api";

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

                option.value = p.usuarioId;
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
            pacienteId: parseInt(pacienteId),
            psicologoId: parseInt(psicologoId),
            fecha: fecha
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

#toast{
    position: fixed;
    top: 25px;
    right: 25px;
    background:#10b981;
    color: white;
    padding: 16px 22px;
    border - radius: 16px;
    font - weight: 800;
    opacity: 0;
    transform: translateY(-20px);
    transition: .35s;
    z - index: 9999;
}

#toast.show{
    opacity: 1;
    transform: translateY(0);
}

#toast.error{
    background: #ef4444;
}

#toast.info{
    background:#6366f1;
}