const API = "https://localhost/api";

// ==========================================
// REGISTRAR PSICÓLOGO
// ==========================================
function registrarPsicologo() {

    const nombre =
        document.getElementById("nombre").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value.trim();

    const telefono =
        document.getElementById("telefono").value.trim();

    const zona =
        document.getElementById("zona").value.trim();

    const especialidad =
        document.getElementById("especialidad").value.trim();

    const msg =
        document.getElementById("msg");

    msg.innerText = "";

    // VALIDACIÓN
    if (!nombre || !email || !password || !especialidad) {

        msg.style.color = "red";
        msg.innerText =
            "Completa todos los campos obligatorios.";

        return;
    }

    const data = {
        nombre,
        email,
        password,
        telefono,
        zona,
        especialidad
    };

    fetch(`${API}/Admin/crear-psicologo`, {

        method: "POST",

        headers: {
            "Content-Type":
                "application/json"
        },

        body:
            JSON.stringify(data)

    })
        .then(async res => {

            const texto =
                await res.text();

            if (!res.ok)
                throw new Error(texto);

            return texto;
        })
        .then(() => {

            msg.style.color = "green";

            msg.innerText =
                "Psicólogo registrado correctamente.";

            limpiarCampos();

        })
        .catch(error => {

            console.log(error);

            msg.style.color = "red";

            msg.innerText =
                "No se pudo registrar.";

        });

}

// ==========================================
// LIMPIAR
// ==========================================
function limpiarCampos() {

    document.getElementById("nombre").value = "";
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("zona").value = "";
    document.getElementById("especialidad").value = "";
}

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