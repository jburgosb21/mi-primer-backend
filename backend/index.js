// --- 1. IMPORTACIÓN DE LIBRERÍAS (Herramientas de trabajo) ---
require('dotenv').config(); // Carga las variables del archivo .env para proteger datos sensibles
const express = require('express'); // Framework para crear el servidor y manejar rutas
const cors = require('cors'); // PERMITE QUE TU HTML (FRONTEND) SE CONECTE AL BACKEND
const jwt = require('jsonwebtoken'); // Genera y verifica tokens (llaves de acceso)
const { Pool } = require('pg'); // Conector para realizar consultas a PostgreSQL
const bcrypt = require('bcrypt'); // Algoritmo para encriptar contraseñas (Seguridad)

const app = express();

// --- 2. CONFIGURACIÓN DE MIDDLEWARES (Filtros de paso) ---

// Habilitamos CORS para que cualquier página web (como tu index.html) pueda hacer peticiones
app.use(cors()); 

// Permite que el servidor pueda leer el cuerpo (body) de las peticiones en formato JSON
app.use(express.json());

// Definimos el puerto: process.env.PORT es el que nos dará Render automáticamente, si no usa el 3000
const port = process.env.PORT || 3000;

// --- 3. CONFIGURACIÓN DE LA BASE DE DATOS ---
const pool = new Pool({
    // Render nos da la URL en process.env.DATABASE_URL. Si no, usa el localhost
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:Y0m34m0much0.@localhost:5432/postgres',
    // SSL es obligatorio en la nube para conexiones seguras a la base de datos
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Nuestra firma secreta para los tokens (debe ser muy difícil de adivinar)
const LLAVE_SECRETA = process.env.LLAVE_SECRETA || "mi_clave_secreta_del_juego_123";

// --- 4. RUTA DE REGISTRO (Crear nuevos jugadores) ---
app.post('/register', async (req, res) => {
    // Extraemos "usuario" y "password" del JSON que envías desde el cliente
    const { usuario, password } = req.body;

    // Validación básica: Si falta alguno, detenemos el proceso
    if (!usuario || !password) {
        return res.status(400).json({ mensaje: "Falta usuario o contraseña" });
    }

    try {
        // Encriptamos la clave para que nadie la vea en la base de datos
        const passwordEncriptada = await bcrypt.hash(password, 10);

        // SQL: Guardamos en la columna 'username' lo que recibimos como 'usuario'
        const consulta = 'INSERT INTO usuarios (username, password, puntos) VALUES ($1, $2, $3) RETURNING *';
        const valores = [usuario, passwordEncriptada, 0];
        
        const resultado = await pool.query(consulta, valores);
        res.json({ mensaje: "¡Usuario creado con éxito!", usuario: resultado.rows[0].username });

    } catch (err) {
        // Si el código es 23505, significa que el nombre de usuario ya existe en la DB
        if (err.code === '23505') {
            return res.status(400).json({ mensaje: "Ese nombre de usuario ya está ocupado" });
        }
        console.error("Error en registro:", err.message);
        res.status(500).json({ mensaje: "Error interno del servidor" });
    }
});

// --- 5. RUTA DE LOGIN (Verificar identidad y entregar "Llave/Token") ---
app.post('/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        // Buscamos al usuario en la base de datos por su nombre
        const consulta = 'SELECT * FROM usuarios WHERE username = $1';
        const resultado = await pool.query(consulta, [usuario]);

        if (resultado.rows.length > 0) {
            const user = resultado.rows[0];
            // Comparamos la clave enviada con la clave encriptada guardada
            const coinciden = await bcrypt.compare(password, user.password);

            if (coinciden) {
                // Creamos el Token (JWT) con la info del usuario
                const token = jwt.sign(
                    { id: user.id, nombre: user.username, puntos: user.puntos }, 
                    LLAVE_SECRETA, 
                    { expiresIn: '1h' } // El token expira en una hora
                );
                res.json({ mensaje: "¡Login exitoso!", token });
            } else {
                res.status(401).json({ mensaje: "Clave incorrecta" });
            }
        } else {
            res.status(401).json({ mensaje: "Usuario no encontrado" });
        }
    } catch (err) {
        console.error("Error en login:", err.message);
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
});

// --- 6. RUTA DE PERFIL (Solo para usuarios con Token válido) ---
app.get('/perfil', (req, res) => {
    // El cliente debe enviar el token en el encabezado 'authorization'
    const token = req.headers['authorization']; 
    if (!token) return res.status(403).json({ mensaje: "Acceso denegado: No hay token" });

    // Verificamos que el token no haya sido alterado
    jwt.verify(token, LLAVE_SECRETA, (err, decoded) => {
        if (err) return res.status(401).json({ mensaje: "Token inválido o expirado" });
        
        // Si es válido, respondemos con los datos que venían dentro del token
        res.json({ 
            mensaje: `Bienvenido al sistema, ${decoded.nombre}`,
            tus_puntos: decoded.puntos 
        });
    });
});

// --- 7. RUTA PARA ACTUALIZAR PUNTOS (Suma progreso en la DB) ---
app.post('/sumar-puntos', async (req, res) => {
    const token = req.headers['authorization'];
    const { cantidad } = req.body;

    if (!token) return res.status(403).json({ mensaje: "No hay token" });

    jwt.verify(token, LLAVE_SECRETA, async (err, decoded) => {
        if (err) return res.status(401).json({ mensaje: "Token inválido" });

        try {
            // Actualizamos el registro en la base de datos usando el ID guardado en el token
            const consulta = 'UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2 RETURNING puntos';
            const resultado = await pool.query(consulta, [cantidad, decoded.id]);

            res.json({ 
                mensaje: "¡Puntos actualizados en la base de datos!", 
                nuevos_puntos: resultado.rows[0].puntos 
            });
        } catch (err) {
            console.error("Error al actualizar:", err.message);
            res.status(500).json({ mensaje: "Error al actualizar puntos" });
        }
    });
});

// --- 8. ARRANQUE DEL SERVIDOR ---
app.listen(port, () => {
    console.log(`🚀 Servidor funcionando en puerto: ${port}`);
});