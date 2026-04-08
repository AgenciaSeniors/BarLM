// ══════════════════════════════════════════════════
// BAR LM — Wrapper de base de datos SQLite
// ══════════════════════════════════════════════════
// Usa better-sqlite3 para acceso síncrono y rápido.
// Crea la BD si no existe y ejecuta el esquema automáticamente.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ruta de la base de datos (server/db/barlm.db)
const DB_PATH = path.join(__dirname, 'barlm.db');

// Ruta del esquema SQL
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Crear/abrir la base de datos
const db = new Database(DB_PATH);

// ──────────────────────────────────────────────────
// Configuración de rendimiento
// ──────────────────────────────────────────────────

// WAL mode: permite lecturas concurrentes mientras se escribe
// Ideal para un servidor web donde múltiples clientes leen el menú
db.pragma('journal_mode = WAL');

// Mejorar rendimiento de escritura (el SO se encarga del flush)
db.pragma('synchronous = NORMAL');

// Habilitar claves foráneas (desactivadas por defecto en SQLite)
db.pragma('foreign_keys = ON');

// ──────────────────────────────────────────────────
// Inicializar esquema (IF NOT EXISTS — seguro de ejecutar siempre)
// ──────────────────────────────────────────────────
try {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    console.log('[DB] Base de datos inicializada correctamente en:', DB_PATH);
} catch (err) {
    console.error('[DB] Error al inicializar el esquema:', err.message);
    process.exit(1);
}

// ──────────────────────────────────────────────────
// Cerrar la BD limpiamente al terminar el proceso
// ──────────────────────────────────────────────────
process.on('exit', () => {
    db.close();
});

process.on('SIGINT', () => {
    console.log('\n[DB] Cerrando base de datos...');
    db.close();
    process.exit(0);
});

module.exports = db;
