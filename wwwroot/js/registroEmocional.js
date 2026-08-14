/* ==========================================
wwwroot/js/registroEmocional.js
VERSIÓN FINAL CORREGIDA 🔥
Corrige:
✅ IDs incorrectos
✅ Error null.value
✅ Guarda perfecto
✅ Limpia formulario
✅ Historial bonito
✅ Fecha y hora México
========================================== */

const API = window.MINDCARE_API_BASE;

/* ==========================================
LOAD
========================================== */
window.onload = function () {
    configurarCategoriaLibre();
    mostrarHistorial();
};

function configurarCategoriaLibre() {
    const categoria = document.getElementById("categoria");
    const campoLibre = document.getElementById("categoriaLibreCampo");
    const entradaLibre = document.getElementById("categoriaLibre");

    if (!categoria || !campoLibre || !entradaLibre) return;

    const actualizarVisibilidad = () => {
        const esOtro = categoria.value === "Otro";
        campoLibre.hidden = !esOtro;
        entradaLibre.required = esOtro;

        if (!esOtro) entradaLibre.value = "";
    };

    categoria.addEventListener("change", actualizarVisibilidad);
    actualizarVisibilidad();
}

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

    const categoriaSeleccionada =
        document.getElementById("categoria").value;

    const categoriaLibre =
        document.getElementById("categoriaLibre").value.trim();

    const categoria =
        categoriaSeleccionada === "Otro"
            ? categoriaLibre
            : categoriaSeleccionada;

    const nota =
        document.getElementById("nota").value.trim();

    const mensaje =
        document.getElementById("mensaje");

    if (
        !usuarioId ||
        animo === "" ||
        categoria === ""
    ) {
        mensaje.innerText =
            "Selecciona tu ánimo y un tema para guardar el registro.";

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

        const texto =
            await response.text();

        if (!response.ok)
            throw new Error(extraerMensaje(texto));

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
        document.getElementById("categoriaLibre").value = "";
        document.getElementById("categoriaLibre").required = false;
        document.getElementById("categoriaLibreCampo").hidden = true;
        document.getElementById("nota").value = "";

        mostrarHistorial();

    } catch (error) {

        mensaje.innerText =
            error.message || "Error al guardar registro.";

        mensaje.style.color =
            "#ef4444";
    }
}

function extraerMensaje(texto) {

    try {
        const data = JSON.parse(texto);
        return data.mensaje || data.title || texto;
    } catch {
        return String(texto || "Error")
            .replaceAll('"', '')
            .trim();
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
                    .toLocaleString(
                        "es-MX",
                        {
                            timeZone:
                                "America/Mexico_City",
                            dateStyle:
                                "short",
                            timeStyle:
                                "short"
                        }
                    );

            contenedor.innerHTML += `
            <div class="history-item">

                <strong>${fecha}</strong><br><br>

                😊 Ánimo:
                ${reg.nivelAnimo}/10<br>

                😰 Estrés:
                ${reg.nivelEstres}/10<br>

                📂 ${escapeHtml(reg.categoria || "General")}<br><br>

                📝 ${reg.nota ? escapeHtml(reg.nota) : "Sin nota personal"}

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

function escapeHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
