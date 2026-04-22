const API = "https://localhost/api";

const params = new URLSearchParams(window.location.search);
const usuarioId = params.get("id");

if (!usuarioId) {
    window.location.href = "dashboardPsicologo.html";
}

/* ===========================
INICIO
=========================== */
window.onload = async function () {
    await cargarDatos();
};

/* ===========================
CARGAR DATOS
=========================== */
async function cargarDatos() {

    await Promise.all([
        cargarRegistros(),
        cargarPHQ9()
    ]);

}

/* ===========================
REGISTROS EMOCIONALES
=========================== */
async function cargarRegistros() {

    try {

        const res = await fetch(
            `${API}/RegistrosEmocionales/${usuarioId}`
        );

        const data = await res.json();

        const box =
            document.getElementById("registros");

        box.innerHTML = "";

        if (!data.length) {
            box.innerHTML = "<li>Sin registros</li>";
            return;
        }

        data.forEach(r => {

            box.innerHTML += `
            <li>
            Ánimo: ${r.nivelAnimo}/10 |
            Estrés: ${r.nivelEstres}/10 |
            ${r.categoria} |
            ${new Date(r.fecha).toLocaleDateString()}
            </li>
            `;
        });

    } catch {

        document.getElementById("registros")
            .innerHTML =
            "<li>Error cargando datos</li>";
    }

}

/* ===========================
PHQ9
=========================== */
async function cargarPHQ9() {

    try {

        const res = await fetch(
            `${API}/TestPHQ9/${usuarioId}`
        );

        const data = await res.json();

        const box =
            document.getElementById("tests");

        box.innerHTML = "";

        if (!data.length) {
            box.innerHTML = "<li>Sin tests</li>";
            return;
        }

        data.forEach(t => {

            box.innerHTML += `
            <li>
            Puntaje: ${t.puntaje} |
            Nivel: ${t.nivel} |
            ${new Date(t.fecha).toLocaleDateString()}
            </li>
            `;
        });

    } catch {

        document.getElementById("tests")
            .innerHTML =
            "<li>Error cargando PHQ9</li>";
    }

}

/* ===========================
VOLVER
=========================== */
function volver() {
    location.href =
        "dashboardPsicologo.html";
}