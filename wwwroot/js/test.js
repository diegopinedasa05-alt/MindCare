/* =====================================
wwwroot/js/test.js
REEMPLAZA COMPLETO
===================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

const preguntas = [

    "1. Poco interés o placer en hacer cosas",
    "2. Sentirse decaído, deprimido o sin esperanza",
    "3. Problemas para dormir o dormir demasiado",
    "4. Cansancio o poca energía",
    "5. Poco apetito o comer en exceso",
    "6. Sentirse mal consigo mismo",
    "7. Problemas para concentrarse",
    "8. Hablar lento o estar inquieto",
    "9. Pensamientos de hacerse daño"

];

let indice = 0;
let respuestas = [];

/* =====================================
LOAD
===================================== */
window.onload = function () {

    mostrarPregunta();

};

/* =====================================
MOSTRAR
===================================== */
function mostrarPregunta() {

    colocarTexto(
        "pregunta",
        preguntas[indice]
    );

    colocarTexto(
        "contador",
        `Pregunta ${indice + 1} de 9`
    );

    const porcentaje =
        (indice / 9) * 100;

    document.getElementById(
        "barra"
    ).style.width =
        porcentaje + "%";

}

/* =====================================
RESPONDER
===================================== */
function responder(valor) {

    respuestas.push(valor);

    indice++;

    if (indice < preguntas.length) {

        mostrarPregunta();

    } else {

        guardarTest();

    }

}

/* =====================================
GUARDAR TEST
===================================== */
async function guardarTest() {

    const usuarioId =
        localStorage.getItem(
            "usuarioId"
        );

    if (!usuarioId) {

        mostrarToast(
            "Sesión no encontrada",
            "error"
        );

        setTimeout(() => {

            location.href =
                "login.html";

        }, 1200);

        return;
    }

    try {

        mostrarToast(
            "Guardando evaluación...",
            "info"
        );

        const res =
            await fetch(
                `${API}/TestPHQ9`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({

                        usuarioId:
                            parseInt(usuarioId),

                        respuestas:
                            respuestas

                    })
                });

        const data =
            await res.json();

        if (!res.ok)
            throw new Error(
                "No se pudo guardar."
            );

        document.getElementById(
            "barra"
        ).style.width =
            "100%";

        colocarTexto(
            "pregunta",
            "Evaluación completada"
        );

        document.querySelector(
            ".answers"
        ).style.display =
            "none";

        const msg =
            document.getElementById(
                "mensaje"
            );

        msg.style.color =
            "#16a34a";

        msg.innerText =
            `Resultado: ${data.nivel} | Puntaje ${data.puntaje}`;

        mostrarToast(
            "Evaluación guardada"
        );

    }
    catch {

        colocarTexto(
            "mensaje",
            "Error al guardar evaluación."
        );

        mostrarToast(
            "Error al guardar",
            "error"
        );

    }

}

/* =====================================
VOLVER
===================================== */
function volverDashboard() {

    location.href =
        "dashboard.html";

}

/* =====================================
UTILIDADES
===================================== */
function colocarTexto(
    id,
    texto
) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText =
            texto;

}

/* =====================================
TOAST PREMIUM
===================================== */
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

    if (tipo === "info")
        toast.classList.add(
            "info"
        );

    toast.classList.add(
        "show"
    );

    setTimeout(() => {

        toast.className =
            "";

    }, 3000);

}