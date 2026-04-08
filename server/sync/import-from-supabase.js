// ══════════════════════════════════════════════════
// BAR LM — Importar datos desde Supabase a SQLite
// ══════════════════════════════════════════════════
// Uso: npm run import
//
// Este script se ejecuta UNA VEZ (o cuando se quiera refrescar)
// para descargar todos los productos, opiniones e imágenes
// de Supabase y poblar la base de datos local SQLite.
//
// Dirección: Supabase → Local (solo para la importación inicial)
// Después, el flujo normal es: Local → Supabase (via sync-engine.js)

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const db = require('../db/database');

const RESTAURANT_ID = process.env.RESTAURANT_ID;

// Directorio para guardar imágenes descargadas
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Crear directorio de uploads si no existe
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function importar() {
    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('   BAR LM — Importación desde Supabase');
    console.log('══════════════════════════════════════════════════');
    console.log('');

    // Verificar variables de entorno
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.error('[Import] Error: SUPABASE_URL y SUPABASE_KEY son necesarios en .env');
        process.exit(1);
    }

    if (!RESTAURANT_ID) {
        console.error('[Import] Error: RESTAURANT_ID es necesario en .env');
        process.exit(1);
    }

    console.log(`  URL: ${process.env.SUPABASE_URL}`);
    console.log(`  Restaurant ID: ${RESTAURANT_ID}`);
    console.log('');

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // ══════════════════════════════════════════════════
    // Paso 1: Importar productos
    // ══════════════════════════════════════════════════
    console.log('[Import] Descargando productos...');

    const { data: productos, error: prodError } = await supabase
        .from('productos')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('id', { ascending: true });

    if (prodError) {
        console.error('[Import] Error al descargar productos:', prodError.message);
        process.exit(1);
    }

    console.log(`[Import] ${productos.length} productos encontrados en Supabase`);

    // Prepared statements para insertar/actualizar productos
    const insertProducto = db.prepare(`
        INSERT INTO productos
            (supabase_id, nombre, precio, categoria, descripcion, imagen_url,
             estado, destacado, activo, restaurant_id, created_at, updated_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const updateProducto = db.prepare(`
        UPDATE productos SET
            nombre = ?, precio = ?, categoria = ?, descripcion = ?, imagen_url = ?,
            estado = ?, destacado = ?, activo = ?, updated_at = ?, synced = 1
        WHERE supabase_id = ?
    `);

    const buscarProducto = db.prepare('SELECT id FROM productos WHERE supabase_id = ?');

    // Transacción atómica para velocidad (muchos INSERT seguidos)
    const importarProductos = db.transaction((listaProductos) => {
        let insertados = 0;
        let actualizados = 0;

        for (const p of listaProductos) {
            const existente = buscarProducto.get(p.id);
            const ahora = new Date().toISOString();

            if (existente) {
                // Actualizar producto existente
                updateProducto.run(
                    p.nombre, p.precio, p.categoria, p.descripcion, p.imagen_url,
                    p.estado || 'disponible',
                    p.destacado ? 1 : 0,
                    p.activo !== false ? 1 : 0,
                    ahora,
                    p.id
                );
                actualizados++;
            } else {
                // Insertar nuevo producto
                insertProducto.run(
                    p.id,
                    p.nombre, p.precio, p.categoria, p.descripcion, p.imagen_url,
                    p.estado || 'disponible',
                    p.destacado ? 1 : 0,
                    p.activo !== false ? 1 : 0,
                    RESTAURANT_ID,
                    p.created_at || ahora,
                    ahora
                );
                insertados++;
            }
        }

        return { insertados, actualizados };
    });

    const resultProd = importarProductos(productos);
    console.log(`[Import] Productos: ${resultProd.insertados} insertados, ${resultProd.actualizados} actualizados`);

    // ══════════════════════════════════════════════════
    // Paso 2: Descargar imágenes desde Supabase Storage
    // ══════════════════════════════════════════════════
    console.log('\n[Import] Descargando imágenes de productos...');

    // Obtener productos que tienen imagen_url apuntando a Supabase Storage
    const productosConImagen = db.prepare(`
        SELECT id, supabase_id, nombre, imagen_url FROM productos
        WHERE imagen_url IS NOT NULL
          AND imagen_url != ''
          AND (imagen_local IS NULL OR imagen_local = '')
    `).all();

    let imagenesDescargadas = 0;

    for (const prod of productosConImagen) {
        try {
            // Solo descargar URLs válidas (http/https)
            if (!prod.imagen_url || !prod.imagen_url.startsWith('http')) {
                continue;
            }

            const nombreArchivo = `barlm_${prod.supabase_id}.jpg`;
            const rutaLocal = path.join(UPLOADS_DIR, nombreArchivo);

            // No re-descargar si el archivo ya existe en disco
            if (fs.existsSync(rutaLocal)) {
                // Solo actualizar el campo imagen_local si falta
                db.prepare('UPDATE productos SET imagen_local = ? WHERE id = ?')
                    .run(nombreArchivo, prod.id);
                console.log(`  [YA EXISTE] ${nombreArchivo}`);
                continue;
            }

            // Descargar la imagen desde la URL
            const response = await fetch(prod.imagen_url);

            if (!response.ok) {
                console.warn(`  [SKIP] "${prod.nombre}" — HTTP ${response.status}`);
                continue;
            }

            // Guardar el archivo en disco
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(rutaLocal, buffer);

            // Actualizar el campo imagen_local en la BD
            db.prepare('UPDATE productos SET imagen_local = ? WHERE id = ?')
                .run(nombreArchivo, prod.id);

            imagenesDescargadas++;
            const sizeKB = (buffer.length / 1024).toFixed(1);
            console.log(`  [OK] ${nombreArchivo} (${sizeKB} KB) — "${prod.nombre}"`);

        } catch (err) {
            console.warn(`  [ERROR] Imagen de "${prod.nombre}": ${err.message}`);
        }
    }

    console.log(`[Import] Imágenes descargadas: ${imagenesDescargadas}`);

    // ══════════════════════════════════════════════════
    // Paso 3: Importar opiniones/reseñas
    // ══════════════════════════════════════════════════
    console.log('\n[Import] Descargando opiniones...');

    const { data: opiniones, error: opError } = await supabase
        .from('opiniones')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('id', { ascending: true });

    let resultOp = { insertadas: 0, omitidas: 0 };

    if (opError) {
        console.error('[Import] Error al descargar opiniones:', opError.message);
        // No salir — las opiniones son opcionales
    } else if (opiniones && opiniones.length > 0) {
        console.log(`[Import] ${opiniones.length} opiniones encontradas en Supabase`);

        const insertOpinion = db.prepare(`
            INSERT INTO opiniones
                (supabase_id, producto_id, cliente_nombre, comentario, puntuacion,
                 restaurant_id, created_at, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `);

        const buscarOpinion = db.prepare('SELECT id FROM opiniones WHERE supabase_id = ?');

        // Crear mapa: supabase_id del producto → id local del producto
        const mapaProductos = {};
        const todosLocales = db.prepare('SELECT id, supabase_id FROM productos').all();
        for (const p of todosLocales) {
            if (p.supabase_id) {
                mapaProductos[p.supabase_id] = p.id;
            }
        }

        const importarOpiniones = db.transaction((listaOpiniones) => {
            let insertadas = 0;
            let omitidas = 0;

            for (const op of listaOpiniones) {
                // Verificar si ya fue importada previamente
                const existente = buscarOpinion.get(op.id);
                if (existente) {
                    omitidas++;
                    continue;
                }

                // Mapear producto_id de Supabase → id local
                const productoLocalId = mapaProductos[op.producto_id];
                if (!productoLocalId) {
                    omitidas++;
                    continue; // El producto no existe localmente
                }

                try {
                    insertOpinion.run(
                        op.id,
                        productoLocalId,
                        op.cliente_nombre || 'Anónimo',
                        op.comentario,
                        op.puntuacion,
                        RESTAURANT_ID,
                        op.created_at || new Date().toISOString()
                    );
                    insertadas++;
                } catch (err) {
                    console.error(`  [ERROR] Opinión #${op.id}: ${err.message}`);
                    omitidas++;
                }
            }

            return { insertadas, omitidas };
        });

        resultOp = importarOpiniones(opiniones);
        console.log(`[Import] Opiniones: ${resultOp.insertadas} insertadas, ${resultOp.omitidas} omitidas`);
    } else {
        console.log('[Import] No se encontraron opiniones para este restaurante.');
    }

    // ══════════════════════════════════════════════════
    // Paso 4: Registrar en sync_log y mostrar resumen
    // ══════════════════════════════════════════════════
    const totalSynced = resultProd.insertados + resultProd.actualizados + resultOp.insertadas;

    db.prepare(`
        INSERT INTO sync_log (sync_type, records_pushed, errors, started_at, finished_at)
        VALUES ('pull', ?, '[]', datetime('now'), datetime('now'))
    `).run(totalSynced);

    // Contar totales finales en la BD local
    const totalProductos = db.prepare('SELECT COUNT(*) AS count FROM productos').get();
    const totalOpiniones = db.prepare('SELECT COUNT(*) AS count FROM opiniones').get();

    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('  IMPORTACIÓN COMPLETADA');
    console.log('══════════════════════════════════════════════════');
    console.log(`  Productos importados:   ${resultProd.insertados}`);
    console.log(`  Productos actualizados: ${resultProd.actualizados}`);
    console.log(`  Imágenes descargadas:   ${imagenesDescargadas}`);
    console.log(`  Opiniones importadas:   ${resultOp.insertadas}`);
    console.log('──────────────────────────────────────────────────');
    console.log(`  Total en BD local: ${totalProductos.count} productos, ${totalOpiniones.count} opiniones`);
    console.log('══════════════════════════════════════════════════');
    console.log('');
}

importar().catch(err => {
    console.error('[Import] Error fatal:', err.message);
    process.exit(1);
});
