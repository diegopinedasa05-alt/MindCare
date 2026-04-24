/* ==========================================
wwwroot/js/registroEmocional.js
VERSIÓN FINAL CORREGIDA 🔥
Corrige:
✅ IDs incorrectos
✅ Error null.value
✅ Guarda perfecto
✅ Limpia formulario
✅ Historial bonito
========================================== */

const API =
    "https://mindcare-production-d670.up.railway.app/api";

/* ==========================================
LOAD
========================================== */
window.onload = function () {
    mostrarHistorial();
};

/* ==========================================
GUARDAR REGISTRO
========================================== */
async function guardarRegistro() {

    const usuarioId =
        localStorage.getItem("usuarioId");

    const animo =
        document.getElementById("animo").value;

    const estres =
        document.getElementById("estres").value;

    const categoria =
        document.getElementById("categoria").value;

    const nota =
        document.getElementById("nota").value.trim();

    const mensaje =
        document.getElementById("mensaje");

    if (
        !usuarioId ||
        animo === "" ||
        categoria === "" ||
        nota === ""
    ) {
        mensaje.innerText =
            "Completa todos los campos.";

        mensaje.style.color =
            "#ef4444";
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/RegistrosEmocionales`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        usuarioId:
                            parseInt(usuarioId),

                        nivelAnimo:
                            parseInt(animo),

                        nivelEstres:
                            parseInt(estres),

                        categoria:
                            categoria,

                        nota:
                            nota
                    })
                }
            );

        if (!response.ok)
            throw new Error();

        /* MENSAJE IA */
        if (
            parseInt(animo) <= 3 &&
            parseInt(estres) >= 8
        ) {

            mensaje.innerText =
                "⚠ Riesgo emocional detectado.";

            mensaje.style.color =
                "#dc2626";

        } else {

            mensaje.innerText =
                "✅ Registro guardado correctamente.";

            mensaje.style.color =
                "#16a34a";
        }

        /* LIMPIAR */
        document.getElementById("animo").value = "";
        document.getElementById("estres").value = 5;
        document.getElementById("valor").innerText = 5;
        document.getElementById("categoria").value = "";
        document.getElementById("nota").value = "";

        mostrarHistorial();

    } catch {

        mensaje.innerText =
            "❌ Error al guardar registro.";

        mensaje.style.color =
            "#ef4444";
    }
}

/* ==========================================
MOSTRAR HISTORIAL
========================================== */
async function mostrarHistorial() {

    const usuarioId =
        localStorage.getItem("usuarioId");

    if (!usuarioId) return;

    try {

        const response =
            await fetch(
                `${API}/RegistrosEmocionales/${usuarioId}?t=${Date.now()}`
            );

        const historial =
            await response.json();

        const contenedor =
            document.getElementById(
                "listaHistorial"
            );

        contenedor.innerHTML = "";

        if (!historial || historial.length === 0) {

            contenedor.innerHTML = `
            <div class="history-item">
                Sin registros todavía.
            </div>
            `;
            return;
        }

        historial.reverse();

        historial.forEach(reg => {

            const fecha =
                new Date(reg.fecha)
                    .toLocaleString();

            contenedor.innerHTML += `
            <div class="history-item">

                <strong>${fecha}</strong><br><br>

                😊 Ánimo:
                ${reg.nivelAnimo}/10<br>

                😰 Estrés:
                ${reg.nivelEstres}/10<br>

                📂 ${reg.categoria}<br><br>

                📝 ${reg.nota}

            </div>
            `;
        });

    } catch {

        document.getElementById(
            "listaHistorial"
        ).innerHTML = `
        <div class="history-item">
            Error cargando historial.
        </div>
        `;
    }
}