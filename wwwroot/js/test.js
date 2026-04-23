const API =
    "https://mindcare-production-d670.up.railway.app/api";

/* =======================================================
MODOS
======================================================= */
let tipoTest = null;
let indice = 0;
let respuestas = [];

/* =======================================================
PHQ9
======================================================= */
const preguntasPHQ = [

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

/* =======================================================
ESTRÉS LABORAL
======================================================= */
const preguntasEstres = [

    "1. Imposibilidad de conciliar el sueño",
    "2. Jaquecas y dolores de cabeza",
    "3. Indigestiones o molestias gastrointestinales",
    "4. Sensación de cansancio extremo o agotamiento",
    "5. Tendencia a comer, beber o fumar más",
    "6. Disminución del interés sexual",
    "7. Respiración entrecortada o ahogo",
    "8. Disminución del apetito",
    "9. Temblores musculares",
    "10. Pinchazos o sensaciones dolorosas",
    "11. Tentaciones fuertes de no levantarse",
    "12. Tendencia a sudor o palpitaciones"

];

/* =======================================================
LOAD
======================================================= */
window.onload = function () {

    mostrarSelector();

};

/* =======================================================
PANTALLA INICIAL
======================================================= */
function mostrarSelector() {

    colocarTexto(
        "pregunta",
        "Selecciona evaluación"
    );

    colocarTexto(
        "contador",
        "MindCare Psicometría"
    );

    document.getElementById(
        "barra"
    ).style.width = "0%";

    document.querySelector(
        ".answers"
    ).innerHTML = `

        <button onclick="iniciarTest('phq')">
             TEST PHQ-9 
        </button>

        <button onclick="iniciarTest('estres')">
             TEST DE ESTRÉS 
        </button>
    `;
}

/* =======================================================
INICIAR
======================================================= */
function iniciarTest(tipo) {

    tipoTest = tipo;
    indice = 0;
    respuestas = [];

    renderOpciones();
    mostrarPregunta();
}

/* =======================================================
PREGUNTA
======================================================= */
function mostrarPregunta() {

    const preguntas =
        tipoTest === "phq"
            ? preguntasPHQ
            : preguntasEstres;

    colocarTexto(
        "pregunta",
        preguntas[indice]
    );

    colocarTexto(
        "contador",
        `Pregunta ${indice + 1} de ${preguntas.length}`
    );

    const porcentaje =
        (indice / preguntas.length) * 100;

    document.getElementById(
        "barra"
    ).style.width =
        porcentaje + "%";
}

/* =======================================================
BOTONES
======================================================= */
function renderOpciones() {

    const box =
        document.querySelector(".answers");

    if (tipoTest === "phq") {

        box.innerHTML = `

        <button onclick="responder(0)">Nunca</button>
        <button onclick="responder(1)">Varios días</button>
        <button onclick="responder(2)">Más de la mitad</button>
        <button onclick="responder(3)">Casi todos</button>
        `;

    } else {

        box.innerHTML = `

        <button onclick="responder(1)">1 Nunca</button>
        <button onclick="responder(2)">2 Casi nunca</button>
        <button onclick="responder(3)">3 Pocas veces</button>
        <button onclick="responder(4)">4 Algunas veces</button>
        <button onclick="responder(5)">5 Frecuente</button>
        <button onclick="responder(6)">6 Muy frecuente</button>
        `;
    }
}

/* =======================================================
RESPONDER
======================================================= */
function responder(valor) {

    respuestas.push(valor);
    indice++;

    const totalPreguntas =
        tipoTest === "phq"
            ? preguntasPHQ.length
            : preguntasEstres.length;

    if (indice < totalPreguntas) {

        mostrarPregunta();

    } else {

        if (tipoTest === "phq")
            guardarPHQ();

        else
            guardarEstres();
    }
}

/* =======================================================
GUARDAR PHQ
======================================================= */
async function guardarPHQ() {

    await guardarGeneral(
        `${API}/TestPHQ9`,
        {
            usuarioId:
                parseInt(localStorage.getItem("usuarioId")),
            respuestas
        }
    );
}

/* =======================================================
GUARDAR ESTRES
======================================================= */
async function guardarEstres() {

    await guardarGeneral(
        `${API}/TestEstresLaboral`,
        {
            usuarioId:
                parseInt(localStorage.getItem("usuarioId")),
            respuestas
        }
    );
}

/* =======================================================
POST GENERAL
======================================================= */
async function guardarGeneral(url, body) {

    try {

        mostrarToast(
            "Guardando...",
            "info"
        );

        const res =
            await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify(body)
            });

        const data =
            await res.json();

        if (!res.ok)
            throw new Error();

        finalizar(data);

    } catch {

        colocarTexto(
            "mensaje",
            "Error al guardar."
        );

        mostrarToast(
            "Error",
            "error"
        );
    }
}

/* =======================================================
FINALIZAR
======================================================= */
function finalizar(data) {

    document.getElementById(
        "barra"
    ).style.width = "100%";

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
        "Guardado correctamente"
    );
}

/* =======================================================
VOLVER
======================================================= */
function volverDashboard() {

    location.href =
        "dashboard.html";
}

/* =======================================================
UTIL
======================================================= */
function colocarTexto(id, texto) {

    const el =
        document.getElementById(id);

    if (el)
        el.innerText = texto;
}

/* =======================================================
TOAST
======================================================= */
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