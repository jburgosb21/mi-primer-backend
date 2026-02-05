const API_URL = "https://backend-juego-27xy.onrender.com";

window.onload = () => {
    const tokenGuardado = localStorage.getItem('mi_token');
    if (tokenGuardado) {
        showGame(tokenGuardado);
    }
};

async function auth(tipo) {
    const usuario = document.getElementById('user').value;
    const password = document.getElementById('pass').value;
    const status = document.getElementById('status');

    if (!usuario || !password) return mensaje("Escribe usuario y clave", "error");

    try {
        status.innerText = "Procesando...";
        const res = await fetch(`${API_URL}/${tipo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });

        const data = await res.json();

        if (res.ok) {
            if (tipo === 'login') {
                localStorage.setItem('mi_token', data.token);
                showGame(data.token);
            } else {
                mensaje("¡Registro exitoso! Ya puedes entrar", "success");
            }
        } else {
            mensaje(data.mensaje, "error");
        }
    } catch (e) {
        mensaje("Error de conexión con el servidor", "error");
    }
}

function showGame(token) {
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('game-zone').style.display = 'block';
    document.getElementById('status').innerText = "Sesión activa";
    verPerfil(token);
}

async function verPerfil(token) {
    try {
        const res = await fetch(`${API_URL}/perfil`, {
            headers: { 'authorization': token }
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('puntos').innerText = data.tus_puntos;
        } else {
            logout();
        }
    } catch (e) { console.error("Error al cargar perfil"); }
}

async function sumarPunto() {
    const token = localStorage.getItem('mi_token');
    try {
        const res = await fetch(`${API_URL}/sumar-puntos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': token },
            body: JSON.stringify({ cantidad: 10 })
        });
        const data = await res.json();
        document.getElementById('puntos').innerText = data.nuevos_puntos;
        mensaje("¡Puntos sincronizados!", "success");
    } catch (e) { mensaje("Error al guardar puntos", "error"); }
}

function logout() {
    localStorage.removeItem('mi_token');
    location.reload();
}

function mensaje(texto, clase) {
    const s = document.getElementById('status');
    s.innerText = texto;
    s.className = clase;
}