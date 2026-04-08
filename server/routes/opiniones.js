// ══════════════════════════════════════════════════
// BAR LM — Rutas de Opiniones / Reseñas
// ══════════════════════════════════════════════════
// Los clientes pueden dejar opiniones sobre los productos.
// Se almacenan localmente y se sincronizan con Supabase cuando hay internet.

const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ID del restaurante
const RESTAURANT_ID = process.env.RESTAURANT_ID;

// ──────────────────────────────────────────────────
// GET /:productoId — Obtener todas las opiniones de un producto
// ──────────────────────────────────────────────────
// Ordenadas de más reciente a más antigua.
router.get('/:productoId', (req, res) => {
    try {
        const { productoId } = req.params;

        const opiniones = db.prepare(`
            SELECT * FROM opiniones
            WHERE producto_id = ?
              AND restaurant_id = ?
            ORDER BY created_at DESC
        `).all(productoId, RESTAURANT_ID);

        res.json(opiniones);

    } catch (err) {
        console.error('[Opiniones] Error al obtener:', err.message);
        res.status(500).json({ error: 'Error al obtener opiniones' });
    }
});

// ──────────────────────────────────────────────────
// GET /:productoId/rating — Obtener promedio y cantidad de valoraciones
// ──────────────────────────────────────────────────
// Devuelve { promedio, cantidad } para mostrar en la tarjeta del producto.
router.get('/:productoId/rating', (req, res) => {
    try {
        const { productoId } = req.params;

        const resultado = db.prepare(`
            SELECT
                ROUND(AVG(puntuacion), 1) AS promedio,
                COUNT(id) AS cantidad
            FROM opiniones
            WHERE producto_id = ?
              AND restaurant_id = ?
        `).get(productoId, RESTAURANT_ID);

        res.json({
            promedio: resultado.promedio || 0,
            cantidad: resultado.cantidad || 0
        });

    } catch (err) {
        console.error('[Opiniones] Error al obtener rating:', err.message);
        res.status(500).json({ error: 'Error al obtener rating' });
    }
});

// ──────────────────────────────────────────────────
// POST / — Crear nueva opinión
// ──────────────────────────────────────────────────
// Recibe: producto_id, cliente_nombre (opcional), comentario, puntuacion (1-5)
router.post('/', (req, res) => {
    try {
        const { producto_id, cliente_nombre, comentario, puntuacion } = req.body;

        // Validaciones
        if (!producto_id) {
            return res.status(400).json({ error: 'producto_id es obligatorio' });
        }

        if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
            return res.status(400).json({ error: 'La puntuación debe ser entre 1 y 5' });
        }

        // Verificar que el producto existe y está activo
        const producto = db.prepare('SELECT id FROM productos WHERE id = ? AND activo = 1').get(producto_id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado o inactivo' });
        }

        const ahora = new Date().toISOString();

        const result = db.prepare(`
            INSERT INTO opiniones
                (producto_id, cliente_nombre, comentario, puntuacion, restaurant_id, created_at, synced)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `).run(
            producto_id,
            cliente_nombre || 'Anónimo',
            comentario || null,
            puntuacion,
            RESTAURANT_ID,
            ahora
        );

        // Devolver la opinión creada
        const opinion = db.prepare('SELECT * FROM opiniones WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(opinion);

    } catch (err) {
        console.error('[Opiniones] Error al crear:', err.message);
        res.status(500).json({ error: 'Error al crear opinión' });
    }
});

module.exports = router;
