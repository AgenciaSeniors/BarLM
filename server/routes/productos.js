// ══════════════════════════════════════════════════
// BAR LM — Rutas de Productos (CRUD)
// ══════════════════════════════════════════════════
// Estas rutas replican la funcionalidad de Supabase localmente.
// Todos los cambios se marcan como synced=0 para sincronizar después.

const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ID del restaurante (filtra para no mezclar con otros negocios)
const RESTAURANT_ID = process.env.RESTAURANT_ID;

// ──────────────────────────────────────────────────
// GET / — Obtener todos los productos activos con promedio de valoraciones
// ──────────────────────────────────────────────────
// Devuelve los productos ordenados por categoría, destacado y fecha.
// Incluye el promedio de puntuaciones (LEFT JOIN con opiniones).
router.get('/', (req, res) => {
    try {
        const productos = db.prepare(`
            SELECT
                p.*,
                ROUND(AVG(o.puntuacion), 1) AS ratingPromedio,
                COUNT(o.id) AS totalOpiniones
            FROM productos p
            LEFT JOIN opiniones o ON o.producto_id = p.id
            WHERE p.activo = 1
              AND p.restaurant_id = ?
            GROUP BY p.id
            ORDER BY p.categoria ASC, p.destacado DESC, p.id DESC
        `).all(RESTAURANT_ID);

        // Reescribir imagen_url: si hay imagen descargada localmente, usar /uploads/
        // Si no, dejar null para que el frontend muestre el placeholder por defecto.
        const productosConImagen = productos.map(p => ({
            ...p,
            imagen_url: p.imagen_local ? `/uploads/${p.imagen_local}` : null
        }));

        res.json(productosConImagen);
    } catch (err) {
        console.error('[Productos] Error al obtener:', err.message);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// ──────────────────────────────────────────────────
// POST / — Crear nuevo producto
// ──────────────────────────────────────────────────
// Usado desde el panel admin para agregar productos al menú.
router.post('/', (req, res) => {
    try {
        const {
            nombre, precio, categoria, descripcion,
            imagen_url, imagen_local, estado, destacado
        } = req.body;

        // Validación básica
        if (!nombre || !categoria) {
            return res.status(400).json({ error: 'Nombre y categoría son obligatorios' });
        }

        const ahora = new Date().toISOString();

        const result = db.prepare(`
            INSERT INTO productos
                (nombre, precio, categoria, descripcion, imagen_url, imagen_local,
                 estado, destacado, activo, restaurant_id, created_at, updated_at, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0)
        `).run(
            nombre,
            precio || 0,
            categoria,
            descripcion || null,
            imagen_url || null,
            imagen_local || null,
            estado || 'disponible',
            destacado ? 1 : 0,
            RESTAURANT_ID,
            ahora,
            ahora
        );

        // Devolver el producto recién creado
        const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(producto);

    } catch (err) {
        console.error('[Productos] Error al crear:', err.message);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// ──────────────────────────────────────────────────
// PUT /:id — Actualizar producto
// ──────────────────────────────────────────────────
// Actualiza cualquier campo del producto. Se marca como no sincronizado.
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre, precio, categoria, descripcion,
            imagen_url, imagen_local, estado, destacado
        } = req.body;

        // Verificar que el producto existe
        const existente = db.prepare('SELECT * FROM productos WHERE id = ? AND restaurant_id = ?').get(id, RESTAURANT_ID);
        if (!existente) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const ahora = new Date().toISOString();

        db.prepare(`
            UPDATE productos SET
                nombre = COALESCE(?, nombre),
                precio = COALESCE(?, precio),
                categoria = COALESCE(?, categoria),
                descripcion = COALESCE(?, descripcion),
                imagen_url = COALESCE(?, imagen_url),
                imagen_local = COALESCE(?, imagen_local),
                estado = COALESCE(?, estado),
                destacado = COALESCE(?, destacado),
                updated_at = ?,
                synced = 0
            WHERE id = ?
        `).run(
            nombre || null,
            precio !== undefined ? precio : null,
            categoria || null,
            descripcion !== undefined ? descripcion : null,
            imagen_url !== undefined ? imagen_url : null,
            imagen_local !== undefined ? imagen_local : null,
            estado || null,
            destacado !== undefined ? (destacado ? 1 : 0) : null,
            ahora,
            id
        );

        // Devolver producto actualizado
        const actualizado = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
        res.json(actualizado);

    } catch (err) {
        console.error('[Productos] Error al actualizar:', err.message);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// ──────────────────────────────────────────────────
// PUT /:id/estado — Cambiar estado (disponible/agotado/proximamente)
// ──────────────────────────────────────────────────
// Toggle rápido usado desde el admin para marcar productos como agotados.
router.put('/:id/estado', (req, res) => {
    try {
        const { id } = req.params;

        const producto = db.prepare('SELECT * FROM productos WHERE id = ? AND restaurant_id = ?').get(id, RESTAURANT_ID);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Ciclo de estados: disponible -> agotado -> disponible
        // Si viene un estado específico en el body, usarlo
        let nuevoEstado;
        if (req.body.estado) {
            nuevoEstado = req.body.estado;
        } else {
            nuevoEstado = producto.estado === 'disponible' ? 'agotado' : 'disponible';
        }

        const ahora = new Date().toISOString();

        db.prepare(`
            UPDATE productos SET estado = ?, updated_at = ?, synced = 0 WHERE id = ?
        `).run(nuevoEstado, ahora, id);

        res.json({ id: Number(id), estado: nuevoEstado });

    } catch (err) {
        console.error('[Productos] Error al cambiar estado:', err.message);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
});

// ──────────────────────────────────────────────────
// PUT /:id/destacado — Toggle producto destacado (TOP)
// ──────────────────────────────────────────────────
router.put('/:id/destacado', (req, res) => {
    try {
        const { id } = req.params;

        const producto = db.prepare('SELECT * FROM productos WHERE id = ? AND restaurant_id = ?').get(id, RESTAURANT_ID);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Toggle: 0 -> 1, 1 -> 0
        const nuevoDestacado = producto.destacado ? 0 : 1;
        const ahora = new Date().toISOString();

        db.prepare(`
            UPDATE productos SET destacado = ?, updated_at = ?, synced = 0 WHERE id = ?
        `).run(nuevoDestacado, ahora, id);

        res.json({ id: Number(id), destacado: nuevoDestacado });

    } catch (err) {
        console.error('[Productos] Error al cambiar destacado:', err.message);
        res.status(500).json({ error: 'Error al cambiar destacado' });
    }
});

// ──────────────────────────────────────────────────
// DELETE /:id — Eliminación suave (soft delete)
// ──────────────────────────────────────────────────
// No borra el registro, solo marca activo=0 para poder sincronizar el cambio.
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const producto = db.prepare('SELECT * FROM productos WHERE id = ? AND restaurant_id = ?').get(id, RESTAURANT_ID);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const ahora = new Date().toISOString();

        db.prepare(`
            UPDATE productos SET activo = 0, updated_at = ?, synced = 0 WHERE id = ?
        `).run(ahora, id);

        res.json({ message: 'Producto eliminado', id: Number(id) });

    } catch (err) {
        console.error('[Productos] Error al eliminar:', err.message);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;
