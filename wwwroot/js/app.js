const API = "https://localhost/api";

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