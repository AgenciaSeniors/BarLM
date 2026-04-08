// ══════════════════════════════════════════════════
// BAR LM — Rutas de Sincronización (Local -> Supabase)
// ══════════════════════════════════════════════════
// Cuando el bar tiene internet (~3 horas al día), el admin presiona
// "Sincronizar" y todos los cambios locales se empujan a Supabase.
// La laptop local es la fuente de verdad (Local -> Supabase).
//
// Delega la lógica pesada al motor de sync (sync/sync-engine.js).

const express = require('express');
const router = express.Router();
const { syncToSupabase, getSyncStatus } = require('../sync/sync-engine');

// ──────────────────────────────────────────────────
// GET /status — Estado de sincronización
// ──────────────────────────────────────────────────
// Devuelve cuántos registros están pendientes de sincronizar.
// Útil para mostrar un badge/indicador en el panel admin.
router.get('/status', (req, res) => {
    try {
        const status = getSyncStatus();

        res.json({
            pendientes: {
                productos: status.productos,
                opiniones: status.opiniones,
                imagenes: status.imagenes,
                total: status.total
            },
            ultimoSync: status.ultimoSync ? {
                tipo: status.ultimoSync.sync_type,
                registros: status.ultimoSync.records_pushed,
                errores: status.ultimoSync.errors,
                fecha: status.ultimoSync.finished_at
            } : null
        });

    } catch (err) {
        console.error('[Sync] Error al obtener estado:', err.message);
        res.status(500).json({ error: 'Error al obtener estado de sincronización' });
    }
});

// ──────────────────────────────────────────────────
// POST /push — Sincronizar cambios locales a Supabase
// ──────────────────────────────────────────────────
// Delega al motor de sincronización (sync-engine.js) que:
// 1. Verifica conexión a internet
// 2. Sincroniza productos (INSERT o UPDATE según supabase_id)
// 3. Sube imágenes locales a Supabase Storage
// 4. Sincroniza opiniones/reseñas
// 5. Registra el resultado en sync_log
router.post('/push', async (req, res) => {
    try {
        const resultado = await syncToSupabase();

        if (!resultado.success && resultado.message) {
            // Error controlado (ej: sin internet, sin variables de entorno)
            return res.status(503).json({
                success: false,
                mensaje: resultado.message,
                error: resultado.message
            });
        }

        res.json({
            success: resultado.success,
            sincronizados: {
                productos: resultado.productos,
                opiniones: resultado.opiniones,
                imagenes: resultado.imagenes
            },
            errores: resultado.errors.length > 0 ? resultado.errors : null,
            mensaje: resultado.success
                ? `Sincronización exitosa: ${resultado.productos + resultado.opiniones + resultado.imagenes} registros`
                : `Sincronización con errores: ${resultado.errors.length} error(es)`
        });

    } catch (err) {
        console.error('[Sync] Error general:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            mensaje: 'Error al sincronizar. Verifica la conexión a internet.'
        });
    }
});

module.exports = router;
