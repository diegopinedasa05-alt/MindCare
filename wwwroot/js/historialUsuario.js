/* =====================================
   wwwroot/js/historialUsuario.js
===================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

/* ID DESDE URL */
const params =
    new URLSearchParams(
        window.location.search
    );

const usuarioId =
    params.get("id");

/* LOAD */
window.onload = function () {

    cargarEmocional();

    cargarPHQ9();

};

/* =====================================
   REGISTROS EMOCIONALES
===================================== */
async function cargarEmocional() {

    try {

        const res =
            await fetch(
                `${API}/RegistrosEmocionales/${usuarioId}`
            );

        const lista =
            await res.json();

        if (lista.length === 0) {

            emocional.innerHTML =
                "No hay registros.";

            return;

        }

        let html = "";

        lista.forEach(x => {

            html += `
<div class="item">

<strong>
${new Date(
                x.fecha
            ).toLocaleDateString()}
</strong><br>

Ánimo:
${x.nivelAnimo}/10<br>

Estrés:
${x.nivelEstres}/10<br>

Categoría:
${x.categoria}<br>

<small>
${x.nota || ""}
</small>

</div>
`;

        });

        emocional.innerHTML =
            html;

    } catch {

        emocional.innerHTML =
            "Error cargando historial.";

    }

}

/* =====================================
   PHQ9
===================================== */
async function cargarPHQ9() {

    try {

        const res =
            await fetch(
                `${API}/TestPHQ9/${usuarioId}`
            );

        const lista =
            await res.json();

        if (lista.length === 0) {

            phq9.innerHTML =
                "Sin tests realizados.";

            return;

        }

        let html = "";

        lista.forEach(x => {

            html += `
<div class="item">

<strong>
${new Date(
                x.fecha
            ).toLocaleDateString()}
</strong><br>

Puntaje:
${x.puntaje}<br>

Nivel:
${x.nivel}

</div>
`;

        });

        phq9.innerHTML =
            html;

    } catch {

        phq9.innerHTML =
            "Error cargando PHQ9.";

    }

}
