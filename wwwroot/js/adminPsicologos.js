/* URL base de la API */
const API = "https://mindcare-production-d670.up.railway.app/api";

/* Registra un nuevo psicólogo en el sistema */
function registrarPsicologo() {

    /* Captura y limpieza de campos */
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

    /* Área de mensajes */
    const msg =
        document.getElementById("msg");

    msg.innerText = "";

    /* Validación de campos obligatorios */
    if (!nombre || !email || !password || !especialidad) {

        msg.style.color = "red";
        msg.innerText =
            "Completa todos los campos obligatorios.";

        return;
    }

    /* Objeto enviado al servidor */
    const data = {
        nombre,
        email,
        password,
        telefono,
        zona,
        especialidad
    };

    /* Solicitud de registro */
    fetch(`${API}/Admin/crear-psicologo`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(data)

    })
        .then(async res => {

            const texto = await res.text();

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

/* Limpia los campos del formulario */
function limpiarCampos() {

    document.getElementById("nombre").value = "";
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("zona").value = "";
    document.getElementById("especialidad").value = "";
}