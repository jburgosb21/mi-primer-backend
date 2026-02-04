// --- 1. IMPORTACIÓN DE LIBRERÍAS (Herramientas de trabajo) ---
require('dotenv').config(); // Carga las variables del archivo .env para proteger datos sensibles
const express = require('express'); // Framework para crear el servidor y manejar rutas
const jwt = require('jsonwebtoken'); // Genera y verifica tokens (llaves de acceso)
const { Pool } = require('pg'); // Conector para realizar consultas a PostgreSQL
const bcrypt = require('bcrypt'); // Algoritmo para encriptar contraseñas (Seguridad)

const app = express();

// Definimos el puerto: process.env.PORT es el que nos dará Render automáticamente
const port = process.env.PORT || 3000;

// Middleware para que el servidor pueda leer el cuerpo (body) de las peticiones JSON
app.use(express.json());

// --- 2. CONFIGURACIÓN DE LA BASE DE DATOS ---
const pool = new Pool({
    // Render nos dará una URL externa. Si no existe, usa la de nuestro localhost
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:Y0m34m0much0.@localhost:5432/postgres',
    // SSL es obligatorio en la nube (Render/Railway) para encriptar la conexión con la DB
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Nuestra firma secreta para los tokens (debe ser muy difícil de adivinar)
const LLAVE_SECRETA = process.env.LLAVE_SECRETA || "mi_clave_secreta_del_juego_123";

// --- 3. RUTA DE REGISTRO (Crear nuevos jugadores) ---
app.post('/register', async (req, res) => {
    const { usuario, password } = req.body;

    // Validación: Evitamos que envíen datos vacíos (Buena práctica)
    if (!usuario || !password) {
        return res.status(400).json({ mensaje: "Falta usuario o contraseña" });
    }

    try {
        // Encriptamos la clave: '10' es el número de vueltas para el hash
        const passwordEncriptada = await bcrypt.hash(password, 10);

        // SQL: Insertamos y usamos RETURNING * para obtener el ID generado de inmediato
        const consulta = 'INSERT INTO usuarios (username, password, puntos) VALUES ($1, $2, $3) RETURNING *';
        const valores = [usuario, passwordEncriptada, 0];
        
        const resultado = await pool.query(consulta, valores);
        res.json({ mensaje: "¡Usuario creado con éxito!", usuario: resultado.rows[0].username });

    } catch (err) {
        // Error 23505: Código de Postgres para "llave duplicada" (Usuario ya existe)
        if (err.code === '23505') {
            return res.status(400).json({ mensaje: "Ese nombre de usuario ya está ocupado" });
        }
        console.error("Error en registro:", err.message);
        res.status(500).json({ mensaje: "Error interno del servidor" });
    }
});

// --- 4. RUTA DE LOGIN (Entrada y entrega de Token) ---
app.post('/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        // Buscamos al usuario por su nombre
        const consulta = 'SELECT * FROM usuarios WHERE username = $1';
        const resultado = await pool.query(consulta, [usuario]);

        if (resultado.rows.length > 0) {
            const user = resultado.rows[0];
            // bcrypt.compare verifica si la clave escrita coincide con el hash de la DB
            const coinciden = await bcrypt.compare(password, user.password);

            if (coinciden) {
                // Generamos el Token con la info que queremos que el cliente guarde (id, nombre, puntos)
                const token = jwt.sign(
                    { id: user.id, nombre: user.username, puntos: user.puntos }, 
                    LLAVE_SECRETA, 
                    { expiresIn: '1h' } // El token caduca en 1 hora por seguridad
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

// --- 5. RUTA DE PERFIL (Protegida con Token) ---
app.get('/perfil', (req, res) => {
    const token = req.headers['authorization']; // El cliente debe enviar el token aquí
    if (!token) return res.status(403).json({ mensaje: "Acceso denegado: No hay token" });

    // Verificamos que el token sea auténtico
    jwt.verify(token, LLAVE_SECRETA, (err, decoded) => {
        if (err) return res.status(401).json({ mensaje: "Token inválido o expirado" });
        
        // Enviamos los datos que venían "empaquetados" en el token
        res.json({ 
            mensaje: `Bienvenido al sistema, ${decoded.nombre}`,
            tus_puntos: decoded.puntos 
        });
    });
});

// --- 6. RUTA PARA ACTUALIZAR PUNTOS (Lógica de juego) ---
app.post('/sumar-puntos', async (req, res) => {
    const token = req.headers['authorization'];
    const { cantidad } = req.body;

    if (!token) return res.status(403).json({ mensaje: "No hay token" });

    jwt.verify(token, LLAVE_SECRETA, async (err, decoded) => {
        if (err) return res.status(401).json({ mensaje: "Token inválido" });

        try {
            // SQL: Incrementamos los puntos usando el ID del usuario logueado
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

// --- 7. ARRANQUE DEL SERVIDOR ---
app.listen(port, () => {
    console.log(`🚀 Servidor funcionando en puerto: ${port}`);
    console.log(`🌍 Listo para recibir peticiones`);
});