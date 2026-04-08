// ══════════════════════════════════════════════════
// BAR LM — Autenticación local del admin
// ══════════════════════════════════════════════════
// Sistema simple de login para el panel admin cuando no hay internet.
// Usa bcrypt para las contraseñas y tokens aleatorios en memoria.
// No se usa JWT porque es un entorno local controlado.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../db/database');

// ──────────────────────────────────────────────────
// Almacén de sesiones activas (en memoria)
// ──────────────────────────────────────────────────
// Formato: { token: { email, createdAt } }
// Se pierden al reiniciar el servidor (el admin simplemente vuelve a hacer login)
const sesiones = {};

// Las sesiones expiran en 24 horas (suficiente para una noche de trabajo)
const SESION_DURACION_MS = 24 * 60 * 60 * 1000;

// ──────────────────────────────────────────────────
// POST /login — Iniciar sesión
// ──────────────────────────────────────────────────
// Recibe: { email, password }
// Devuelve: { token, email } o error 401
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }

        // Buscar usuario en la BD local
        const usuario = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email);

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificar contraseña con bcrypt
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token de sesión aleatorio (32 bytes = 64 caracteres hex)
        const token = crypto.randomBytes(32).toString('hex');

        // Guardar sesión en memoria
        sesiones[token] = {
            email: usuario.email,
            createdAt: Date.now()
        };

        console.log(`[Auth] Login exitoso: ${usuario.email}`);

        res.json({
            token,
            email: usuario.email
        });

    } catch (err) {
        console.error('[Auth] Error en login:', err.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ──────────────────────────────────────────────────
// POST /logout — Cerrar sesión
// ──────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token && sesiones[token]) {
        console.log(`[Auth] Logout: ${sesiones[token].email}`);
        delete sesiones[token];
    }

    res.json({ message: 'Sesión cerrada' });
});

// ──────────────────────────────────────────────────
// GET /verify — Verificar si el token es válido
// ──────────────────────────────────────────────────
// Usado por el frontend para comprobar si la sesión sigue activa.
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || !sesiones[token]) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Verificar si la sesión ha expirado
    const sesion = sesiones[token];
    if (Date.now() - sesion.createdAt > SESION_DURACION_MS) {
        delete sesiones[token];
        return res.status(401).json({ error: 'Sesión expirada' });
    }

    res.json({ email: sesion.email, valid: true });
});

module.exports = router;
