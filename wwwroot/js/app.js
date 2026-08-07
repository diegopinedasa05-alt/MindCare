const API = window.MINDCARE_API_BASE;

document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    const usuarioId = localStorage.getItem("usuarioId");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    fetch(`${API}/TestPHQ9/estadisticas/${usuarioId}`, {
        headers: { "Authorization": "Bearer " + token }
    })
        .then(res => res.json())
        .then(data => {
            document.getElementById("puntaje").innerText = data.ultimoPuntaje;
            document.getElementById("nivel").innerText = data.ultimoNivelDepresion;
        });
});

function irTest() {
    window.location.href = "test.html";
}
function irRegistro() {
    window.location.href = "registroEmocional.html";
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}
