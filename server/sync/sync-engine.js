// ══════════════════════════════════════════════════
// BAR LM — Motor de Sincronización (SQLite → Supabase)
// ══════════════════════════════════════════════════
// Empuja cambios locales (productos, opiniones, imágenes)
// hacia Supabase cuando hay conexión a internet.
// Dirección: Local → Supabase (la laptop es fuente de verdad).

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const db = require('../db/database');

// Directorio donde se guardan las imágenes subidas localmente
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// ══════════════════════════════════════════════════
// verificarConexion — Comprueba si hay internet
// ══════════════════════════════════════════════════
// Hace un HEAD request al URL de Supabase. Si falla,
// significa que no hay red disponible.

async function verificarConexion(supabaseUrl) {
    try {
        const controller = new AbortController();
        // Timeout de 15 segundos (conexiones lentas como datos móviles cubanos)
        const timeout = setTimeout(() => controller.abort(), 15000);

        const resp = await fetch(supabaseUrl, {
            method: 'HEAD',
            signal: controller.signal
        });

        clearTimeout(timeout);
        // Cualquier respuesta HTTP significa que hay internet
        // (Supabase puede devolver 200, 301, 400, 404 — todos indican conectividad)
        console.log('[SYNC] Respuesta de Supabase:', resp.status);
        return resp.status > 0;
    } catch (err) {
        console.log('[SYNC] Sin conexion:', err.message);
        return false;
    }
}

// ══════════════════════════════════════════════════
// syncToSupabase — Función principal de sincronización
// ══════════════════════════════════════════════════
// 1. Verifica internet
// 2. Sincroniza productos no sincronizados (synced = 0)
// 3. Sube imágenes locales pendientes
// 4. Sincroniza opiniones/reseñas pendientes
// 5. Registra el resultado en sync_log

async function syncToSupabase() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const RESTAURANT_ID = process.env.RESTAURANT_ID;

    // Validar que las variables de entorno estén configuradas
    if (!SUPABASE_URL || !SUPABASE_KEY || !RESTAURANT_ID) {
        return {
            success: false,
            message: 'Faltan variables de entorno: SUPABASE_URL, SUPABASE_KEY o RESTAURANT_ID'
        };
    }

    // ── Paso 1: Verificar conexión a internet ───────
    console.log('[SYNC] Verificando conexión a internet...');
    const hayInternet = await verificarConexion(SUPABASE_URL);

    if (!hayInternet) {
        return {
            success: false,
            message: 'Sin conexión a internet. Intenta de nuevo cuando haya red.'
        };
    }

    console.log('[SYNC] Conexión verificada. Iniciando sincronización...');

    // ── Crear cliente Supabase con service_role key ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Contadores para el resumen final
    let productosSync = 0;
    let opinionesSync = 0;
    let imagenesSync = 0;
    const errores = [];

    // Registrar inicio en sync_log
    const logStmt = db.prepare(`
        INSERT INTO sync_log (sync_type, started_at)
        VALUES ('push', datetime('now'))
    `);
    const logResult = logStmt.run();
    const logId = logResult.lastInsertRowid;

    try {
        // ── Paso 2: Sincronizar productos ───────────
        console.log('[SYNC] Sincronizando productos...');
        productosSync = await syncProductos(supabase, RESTAURANT_ID, errores);

        // ── Paso 3: Sincronizar imágenes ────────────
        console.log('[SYNC] Sincronizando imágenes...');
        imagenesSync = await syncImagenes(supabase, errores);

        // ── Paso 4: Sincronizar opiniones ───────────
        console.log('[SYNC] Sincronizando opiniones...');
        opinionesSync = await syncOpiniones(supabase, RESTAURANT_ID, errores);

    } catch (err) {
        errores.push(`Error general: ${err.message}`);
        console.error('[SYNC] Error general:', err.message);
    }

    // ── Paso 5: Actualizar sync_log ─────────────────
    const updateLog = db.prepare(`
        UPDATE sync_log
        SET records_pushed = ?,
            errors = ?,
            finished_at = datetime('now')
        WHERE id = ?
    `);
    updateLog.run(
        productosSync + opinionesSync + imagenesSync,
        JSON.stringify(errores),
        logId
    );

    const resumen = {
        success: errores.length === 0,
        productos: productosSync,
        opiniones: opinionesSync,
        imagenes: imagenesSync,
        errors: errores
    };

    console.log('[SYNC] Sincronización completada:', resumen);
    return resumen;
}

// ══════════════════════════════════════════════════
// syncProductos — Empuja productos locales a Supabase
// ══════════════════════════════════════════════════
// - Si supabase_id es NULL → INSERT nuevo producto en Supabase
// - Si supabase_id existe → UPDATE el producto existente
// - Marca synced = 1 tras éxito

async function syncProductos(supabase, restaurantId, errores) {
    // Obtener todos los productos pendientes de sincronizar
    const pendientes = db.prepare(`
        SELECT * FROM productos WHERE synced = 0
    `).all();

    if (pendientes.length === 0) {
        console.log('[SYNC] No hay productos pendientes de sincronizar.');
        return 0;
    }

    console.log(`[SYNC] ${pendientes.length} producto(s) pendiente(s)...`);
    let count = 0;

    for (const producto of pendientes) {
        try {
            // Preparar datos para Supabase (sin campos locales)
            const datos = {
                nombre: producto.nombre,
                precio: producto.precio,
                categoria: producto.categoria,
                descripcion: producto.descripcion || '',
                imagen_url: producto.imagen_url || '',
                estado: producto.estado,
                destacado: producto.destacado ? true : false,
                activo: producto.activo ? true : false,
                restaurant_id: restaurantId
            };

            if (producto.supabase_id) {
                // ── UPDATE: el producto ya existe en Supabase ──
                const { error } = await supabase
                    .from('productos')
                    .update(datos)
                    .eq('id', producto.supabase_id);

                if (error) {
                    throw new Error(`UPDATE producto "${producto.nombre}": ${error.message}`);
                }

                console.log(`[SYNC] Producto actualizado: ${producto.nombre} (Supabase ID: ${producto.supabase_id})`);

            } else {
                // ── INSERT: producto nuevo creado offline ──
                const { data, error } = await supabase
                    .from('productos')
                    .insert([datos])
                    .select('id')
                    .single();

                if (error) {
                    throw new Error(`INSERT producto "${producto.nombre}": ${error.message}`);
                }

                // Guardar el ID asignado por Supabase en la tabla local
                const updateId = db.prepare(`
                    UPDATE productos SET supabase_id = ? WHERE id = ?
                `);
                updateId.run(data.id, producto.id);

                console.log(`[SYNC] Producto insertado: ${producto.nombre} → Supabase ID: ${data.id}`);
            }

            // Marcar como sincronizado
            const markSync = db.prepare(`
                UPDATE productos SET synced = 1, updated_at = datetime('now') WHERE id = ?
            `);
            markSync.run(producto.id);
            count++;

        } catch (err) {
            errores.push(err.message);
            console.error(`[SYNC] Error en producto "${producto.nombre}":`, err.message);
        }
    }

    return count;
}

// ══════════════════════════════════════════════════
// syncImagenes — Sube imágenes locales a Supabase Storage
// ══════════════════════════════════════════════════
// Busca productos que tienen imagen_local pero cuyo imagen_url
// todavía apunta a /uploads/ (local). Las sube al bucket 'BarLM'
// y actualiza la URL tanto local como en Supabase.

async function syncImagenes(supabase, errores) {
    // Buscar productos con imagen local pendiente de subir
    const conImagenLocal = db.prepare(`
        SELECT * FROM productos
        WHERE imagen_local IS NOT NULL
          AND imagen_local != ''
          AND (imagen_url LIKE '/uploads/%' OR imagen_url IS NULL OR imagen_url = '')
          AND supabase_id IS NOT NULL
    `).all();

    if (conImagenLocal.length === 0) {
        console.log('[SYNC] No hay imágenes pendientes de subir.');
        return 0;
    }

    console.log(`[SYNC] ${conImagenLocal.length} imagen(es) pendiente(s) de subir...`);
    let count = 0;

    for (const producto of conImagenLocal) {
        try {
            const archivoLocal = path.join(UPLOADS_DIR, producto.imagen_local);

            // Verificar que el archivo existe en disco
            if (!fs.existsSync(archivoLocal)) {
                errores.push(`Archivo no encontrado: ${producto.imagen_local}`);
                console.warn(`[SYNC] Archivo no encontrado: ${archivoLocal}`);
                continue;
            }

            // Leer el archivo como buffer
            const fileBuffer = fs.readFileSync(archivoLocal);

            // Nombre del archivo en Supabase Storage
            const nombreRemoto = `barlm_${producto.supabase_id}.jpg`;

            // Subir al bucket 'BarLM' (upsert para sobreescribir si ya existe)
            const { error: uploadError } = await supabase.storage
                .from('BarLM')
                .upload(nombreRemoto, fileBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) {
                throw new Error(`Upload "${producto.nombre}": ${uploadError.message}`);
            }

            // Obtener la URL pública de la imagen subida
            const { data: urlData } = supabase.storage
                .from('BarLM')
                .getPublicUrl(nombreRemoto);

            const urlPublica = urlData.publicUrl;

            // Actualizar la URL en Supabase (tabla productos)
            const { error: updateError } = await supabase
                .from('productos')
                .update({ imagen_url: urlPublica })
                .eq('id', producto.supabase_id);

            if (updateError) {
                throw new Error(`Update imagen_url "${producto.nombre}": ${updateError.message}`);
            }

            // Actualizar la URL localmente también (para que no se re-suba)
            const updateLocal = db.prepare(`
                UPDATE productos SET imagen_url = ?, updated_at = datetime('now') WHERE id = ?
            `);
            updateLocal.run(urlPublica, producto.id);

            console.log(`[SYNC] Imagen subida: ${producto.nombre} → ${urlPublica}`);
            count++;

        } catch (err) {
            errores.push(err.message);
            console.error(`[SYNC] Error subiendo imagen de "${producto.nombre}":`, err.message);
        }
    }

    return count;
}

// ══════════════════════════════════════════════════
// syncOpiniones — Empuja reseñas locales a Supabase
// ══════════════════════════════════════════════════
// Para cada opinión no sincronizada:
// 1. Busca el supabase_id del producto asociado
// 2. Inserta la opinión en Supabase con el producto_id correcto
// 3. Marca synced = 1 localmente

async function syncOpiniones(supabase, restaurantId, errores) {
    // Obtener todas las opiniones pendientes de sincronizar
    const pendientes = db.prepare(`
        SELECT * FROM opiniones WHERE synced = 0
    `).all();

    if (pendientes.length === 0) {
        console.log('[SYNC] No hay opiniones pendientes de sincronizar.');
        return 0;
    }

    console.log(`[SYNC] ${pendientes.length} opinión(es) pendiente(s)...`);
    let count = 0;

    for (const opinion of pendientes) {
        try {
            // Buscar el supabase_id del producto al que pertenece esta opinión
            const producto = db.prepare(`
                SELECT supabase_id FROM productos WHERE id = ?
            `).get(opinion.producto_id);

            if (!producto || !producto.supabase_id) {
                // No se puede sincronizar si el producto no tiene supabase_id
                errores.push(
                    `Opinión #${opinion.id}: producto local #${opinion.producto_id} no tiene supabase_id. ` +
                    'Sincroniza los productos primero.'
                );
                continue;
            }

            // Preparar datos para Supabase
            const datos = {
                producto_id: producto.supabase_id,  // Usar el ID de Supabase, no el local
                cliente_nombre: opinion.cliente_nombre || 'Anónimo',
                comentario: opinion.comentario || '',
                puntuacion: opinion.puntuacion,
                restaurant_id: restaurantId
            };

            const { data, error } = await supabase
                .from('opiniones')
                .insert([datos])
                .select('id')
                .single();

            if (error) {
                throw new Error(`INSERT opinión #${opinion.id}: ${error.message}`);
            }

            // Guardar supabase_id de la opinión y marcar como sincronizada
            const markSync = db.prepare(`
                UPDATE opiniones SET supabase_id = ?, synced = 1 WHERE id = ?
            `);
            markSync.run(data.id, opinion.id);

            console.log(`[SYNC] Opinión sincronizada: #${opinion.id} → Supabase ID: ${data.id}`);
            count++;

        } catch (err) {
            errores.push(err.message);
            console.error(`[SYNC] Error en opinión #${opinion.id}:`, err.message);
        }
    }

    return count;
}

// ══════════════════════════════════════════════════
// getSyncStatus — Estado actual de sincronización
// ══════════════════════════════════════════════════
// Cuenta cuántos registros están pendientes de sincronizar
// para mostrar en la interfaz del admin.

function getSyncStatus() {
    const productosPendientes = db.prepare(`
        SELECT COUNT(*) AS count FROM productos WHERE synced = 0
    `).get().count;

    const opinionesPendientes = db.prepare(`
        SELECT COUNT(*) AS count FROM opiniones WHERE synced = 0
    `).get().count;

    // Imágenes pendientes: tienen imagen_local pero URL local
    const imagenesPendientes = db.prepare(`
        SELECT COUNT(*) AS count FROM productos
        WHERE imagen_local IS NOT NULL
          AND imagen_local != ''
          AND (imagen_url LIKE '/uploads/%' OR imagen_url IS NULL OR imagen_url = '')
    `).get().count;

    // Último log de sincronización
    const ultimoSync = db.prepare(`
        SELECT * FROM sync_log ORDER BY id DESC LIMIT 1
    `).get();

    return {
        productos: productosPendientes,
        opiniones: opinionesPendientes,
        imagenes: imagenesPendientes,
        total: productosPendientes + opinionesPendientes + imagenesPendientes,
        ultimoSync: ultimoSync || null
    };
}

module.exports = {
    syncToSupabase,
    getSyncStatus
};
