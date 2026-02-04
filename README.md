# 🎮 Mi Primer Backend de Juego

Este es un sistema de autenticación y gestión de puntos para un videojuego, construido con **Node.js**, **Express** y **PostgreSQL**.

## 🚀 Características
- **Registro Seguro**: Las contraseñas se encriptan con `bcrypt`.
- **Autenticación JWT**: Pases de acceso temporales para proteger rutas.
- **Base de Datos Real**: Conexión con PostgreSQL para guardar usuarios y puntos.
- **Rutas Protegidas**: Solo usuarios logueados pueden ver su perfil o sumar puntos.

## 🛠️ Instalación

1. Clona este proyecto.
2. Instala las librerías:
   ```bash
   npm install