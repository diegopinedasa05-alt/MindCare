/* =====================================
recuperar.js LIMPIO FINAL
===================================== */

var API =
    "https://mindcare-production-d670.up.railway.app/api";

/* =====================================
ENVIAR CODIGO
===================================== */
async function enviarCodigo() {

    const email =
        document.getElementById("email").value.trim();

    const mensaje =
        document.getElementById("mensaje");

    mensaje.innerText = "";

    if (!email) {
        mensaje.innerText =
            "Ingresa tu correo.";
        return;
    }

    try {

        const res =
            await fetch(
                `${API}/Auth/enviar-codigo`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(email)
                });

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(txt);

        mensaje.style.color =
            "#16a34a";

        mensaje.innerText =
            txt;

        document.getElementById("paso1").style.display =
            "none";

        document.getElementById("paso2").style.display =
            "block";

    } catch (error) {

        mensaje.style.color =
            "#ef4444";

        mensaje.innerText =
            error.message;
    }
}

/* =====================================
CAMBIAR PASSWORD
===================================== */
async function cambiarPassword() {

    const email =
        document.getElementById("email").value.trim();

    const codigo =
        document.getElementById("codigo").value.trim();

    const password =
        document.getElementById("password").value.trim();

    const mensaje =
        document.getElementById("mensaje");

    try {

        const res =
            await fetch(
                `${API}/Auth/recuperar`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        codigo: codigo,
                        nuevaPassword: password
                    })
                });

        const txt =
            await res.text();

        if (!res.ok)
            throw new Error(txt);

        mensaje.style.color =
            "#16a34a";

        mensaje.innerText =
            txt;

        setTimeout(() => {
            location.href = "login.html";
        }, 1500);

    } catch (error) {

        mensaje.style.color =
            "#ef4444";

        mensaje.innerText =
            error.message;
    }
}